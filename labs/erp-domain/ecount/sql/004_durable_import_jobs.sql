-- Durable import-job boundary for the isolated ERP Lab only.

CREATE TABLE erp_lab.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES erp_lab.tenants(id),
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_REJECTIONS', 'FAILED')),
  requested_count integer NOT NULL CHECK (requested_count > 0),
  processed_count integer NOT NULL DEFAULT 0,
  posted_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE erp_lab.import_job_rows (
  job_id uuid NOT NULL REFERENCES erp_lab.import_jobs(id) ON DELETE CASCADE,
  row_index integer NOT NULL CHECK (row_index >= 0),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  terminal_status text CHECK (terminal_status IN ('POSTED', 'REJECTED')),
  document_id uuid REFERENCES erp_lab.inventory_documents(id),
  error_code text,
  attempt_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, row_index)
);

CREATE INDEX import_job_rows_pending_idx ON erp_lab.import_job_rows(job_id, row_index) WHERE terminal_status IS NULL;

CREATE OR REPLACE FUNCTION erp_lab.create_import_job(
  p_tenant_id uuid, p_idempotency_key text, p_rows jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE v_job_id uuid;
BEGIN
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = ''
     OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_IMPORT_JOB_INPUT';
  END IF;
  SELECT id INTO v_job_id FROM erp_lab.import_jobs
   WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_job_id; END IF;
  INSERT INTO erp_lab.import_jobs(tenant_id, idempotency_key, status, requested_count)
  VALUES (p_tenant_id, p_idempotency_key, 'QUEUED', jsonb_array_length(p_rows)) RETURNING id INTO v_job_id;
  INSERT INTO erp_lab.import_job_rows(job_id, row_index, payload, payload_hash)
  SELECT v_job_id, ordinal - 1, value, md5(value::text)
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS source(value, ordinal);
  RETURN v_job_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_job_id FROM erp_lab.import_jobs
   WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.claim_import_job(p_job_id uuid, p_lease_seconds integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE v_token uuid := gen_random_uuid();
BEGIN
  UPDATE erp_lab.import_jobs
     SET status = 'RUNNING', lease_token = v_token,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
   WHERE id = p_job_id
     AND status IN ('QUEUED', 'RUNNING')
     AND (lease_expires_at IS NULL OR lease_expires_at < now())
  RETURNING lease_token INTO v_token;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'IMPORT_JOB_NOT_CLAIMABLE'; END IF;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.process_import_job_chunk(p_job_id uuid, p_lease_token uuid, p_chunk_size integer)
RETURNS TABLE(processed integer, posted integer, rejected integer, completed boolean)
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE v_processed integer := 0; v_posted integer := 0; v_rejected integer := 0; v_remaining integer;
BEGIN
  IF p_chunk_size <= 0 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_IMPORT_CHUNK_SIZE'; END IF;
  PERFORM 1 FROM erp_lab.import_jobs
   WHERE id = p_job_id AND status = 'RUNNING' AND lease_token = p_lease_token AND lease_expires_at > now()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'IMPORT_JOB_LEASE_LOST'; END IF;
  WITH locked_rows AS MATERIALIZED (
    SELECT row_index, payload
      FROM erp_lab.import_job_rows WHERE job_id = p_job_id AND terminal_status IS NULL
     ORDER BY row_index LIMIT p_chunk_size FOR UPDATE SKIP LOCKED
  ), candidates AS MATERIALIZED (
    SELECT row_index, payload, row_number() OVER (ORDER BY row_index) - 1 AS local_index
      FROM locked_rows
  ), payloads AS (
    SELECT COALESCE(jsonb_agg(payload ORDER BY local_index), '[]'::jsonb) AS rows FROM candidates
  ), results AS (
    SELECT result.* FROM payloads CROSS JOIN LATERAL erp_lab.bulk_receipt_documents(
      (SELECT tenant_id FROM erp_lab.import_jobs WHERE id = p_job_id), payloads.rows
    ) AS result
  ), updated AS (
    UPDATE erp_lab.import_job_rows AS job_row
       SET terminal_status = results.status, document_id = results.document_id,
           error_code = results.error_code, attempt_count = job_row.attempt_count + 1
      -- bulk_receipt_documents reports its JSON-array ordinal from 1, while
      -- candidates use a zero-based local index for the staged job row.
      FROM candidates JOIN results ON results.row_index - 1 = candidates.local_index
     WHERE job_row.job_id = p_job_id AND job_row.row_index = candidates.row_index
    RETURNING job_row.terminal_status
  ) SELECT count(*), count(*) FILTER (WHERE terminal_status = 'POSTED'), count(*) FILTER (WHERE terminal_status = 'REJECTED')
      INTO v_processed, v_posted, v_rejected FROM updated;
  UPDATE erp_lab.import_jobs
     SET processed_count = processed_count + v_processed, posted_count = posted_count + v_posted,
         rejected_count = rejected_count + v_rejected, lease_expires_at = now() + interval '30 seconds', updated_at = now()
   WHERE id = p_job_id;
  SELECT count(*) INTO v_remaining FROM erp_lab.import_job_rows WHERE job_id = p_job_id AND terminal_status IS NULL;
  IF v_remaining = 0 THEN
    UPDATE erp_lab.import_jobs SET status = CASE WHEN rejected_count > 0 THEN 'COMPLETED_WITH_REJECTIONS' ELSE 'COMPLETED' END,
      completed_at = now(), lease_token = NULL, lease_expires_at = NULL, updated_at = now() WHERE id = p_job_id;
  END IF;
  RETURN QUERY SELECT v_processed, v_posted, v_rejected, v_remaining = 0;
END;
$$;

-- Optimized only for the measured receipt-import shape: one receipt line per
-- staged row. Other document types continue through the workflow above.
CREATE OR REPLACE FUNCTION erp_lab.process_receipt_import_job_chunk_set_based(p_job_id uuid, p_lease_token uuid, p_chunk_size integer)
RETURNS TABLE(processed integer, posted integer, rejected integer, completed boolean)
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE v_processed integer; v_posted integer; v_rejected integer; v_remaining integer; v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM erp_lab.import_jobs
   WHERE id=p_job_id AND status='RUNNING' AND lease_token=p_lease_token AND lease_expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='IMPORT_JOB_LEASE_LOST'; END IF;
  CREATE TEMP TABLE import_chunk ON COMMIT DROP AS
  SELECT row_index, payload, (payload->>'idempotency_key') AS idempotency_key,
    (payload->'lines'->0->>'product_id')::uuid AS product_id,
    (payload->'lines'->0->>'quantity')::numeric AS quantity,
    COALESCE(NULLIF(payload->'lines'->0->>'unit',''), 'EA') AS unit,
    (payload->'lines'->0->>'destination_location_id')::uuid AS location_id
  FROM erp_lab.import_job_rows WHERE job_id=p_job_id AND terminal_status IS NULL ORDER BY row_index LIMIT p_chunk_size FOR UPDATE SKIP LOCKED;
  UPDATE erp_lab.import_job_rows r SET terminal_status='REJECTED', error_code='INVALID_DOCUMENT_UNIT', attempt_count=attempt_count+1
    FROM import_chunk c LEFT JOIN erp_lab.products p ON p.id=c.product_id AND p.tenant_id=v_tenant
      LEFT JOIN erp_lab.product_unit_conversions u ON u.product_id=c.product_id AND u.unit=c.unit
   WHERE r.job_id=p_job_id AND r.row_index=c.row_index AND (p.id IS NULL OR u.product_id IS NULL);
  INSERT INTO erp_lab.inventory_documents(id,tenant_id,document_type,status,idempotency_key)
  SELECT gen_random_uuid(),v_tenant,'receipt','POSTED',c.idempotency_key FROM import_chunk c
   JOIN erp_lab.import_job_rows r ON r.job_id=p_job_id AND r.row_index=c.row_index AND r.terminal_status IS NULL;
  INSERT INTO erp_lab.inventory_document_lines(id,document_id,product_id,quantity,input_quantity,input_unit,destination_location_id)
  SELECT gen_random_uuid(),d.id,c.product_id,c.quantity*u.base_quantity_per_unit,c.quantity,c.unit,c.location_id
    FROM import_chunk c JOIN erp_lab.inventory_documents d ON d.tenant_id=v_tenant AND d.idempotency_key=c.idempotency_key
    JOIN erp_lab.product_unit_conversions u ON u.product_id=c.product_id AND u.unit=c.unit
    JOIN erp_lab.import_job_rows r ON r.job_id=p_job_id AND r.row_index=c.row_index AND r.terminal_status IS NULL;
  INSERT INTO erp_lab.stock_ledger(tenant_id,document_id,document_line_id,product_id,location_id,quantity_delta)
  SELECT v_tenant,d.id,l.id,l.product_id,l.destination_location_id,l.quantity FROM erp_lab.inventory_document_lines l JOIN erp_lab.inventory_documents d ON d.id=l.document_id WHERE d.tenant_id=v_tenant AND d.idempotency_key IN (SELECT idempotency_key FROM import_chunk);
  INSERT INTO erp_lab.inventory_balances(tenant_id,product_id,location_id,quantity,version)
  SELECT v_tenant,l.product_id,l.destination_location_id,sum(l.quantity),0 FROM erp_lab.inventory_document_lines l JOIN erp_lab.inventory_documents d ON d.id=l.document_id WHERE d.tenant_id=v_tenant AND d.idempotency_key IN (SELECT idempotency_key FROM import_chunk) GROUP BY l.product_id,l.destination_location_id
  ON CONFLICT (tenant_id,product_id,location_id) DO UPDATE SET quantity=erp_lab.inventory_balances.quantity+EXCLUDED.quantity, version=erp_lab.inventory_balances.version+1;
  UPDATE erp_lab.import_job_rows r SET terminal_status='POSTED', document_id=d.id, attempt_count=attempt_count+1
    FROM import_chunk c JOIN erp_lab.inventory_documents d ON d.tenant_id=v_tenant AND d.idempotency_key=c.idempotency_key
   WHERE r.job_id=p_job_id AND r.row_index=c.row_index AND r.terminal_status IS NULL;
  SELECT count(*),count(*) FILTER(WHERE terminal_status='POSTED'),count(*) FILTER(WHERE terminal_status='REJECTED') INTO v_processed,v_posted,v_rejected FROM erp_lab.import_job_rows WHERE job_id=p_job_id AND row_index IN (SELECT row_index FROM import_chunk);
  UPDATE erp_lab.import_jobs SET processed_count=processed_count+v_processed,posted_count=posted_count+v_posted,rejected_count=rejected_count+v_rejected,lease_expires_at=now()+interval '30 seconds' WHERE id=p_job_id;
  SELECT count(*) INTO v_remaining FROM erp_lab.import_job_rows WHERE job_id=p_job_id AND terminal_status IS NULL;
  IF v_remaining=0 THEN UPDATE erp_lab.import_jobs SET status=CASE WHEN rejected_count>0 THEN 'COMPLETED_WITH_REJECTIONS' ELSE 'COMPLETED' END,completed_at=now(),lease_token=NULL,lease_expires_at=NULL WHERE id=p_job_id; END IF;
  RETURN QUERY SELECT v_processed,v_posted,v_rejected,v_remaining=0;
END;
$$;
