-- Posting functions for the isolated ERP Domain Lab only.

CREATE OR REPLACE FUNCTION erp_lab.assert_location_in_tenant(
  p_location_id uuid,
  p_tenant_id uuid,
  p_name text
) RETURNS void
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
BEGIN
  IF p_location_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM erp_lab.locations WHERE id = p_location_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('INVALID_%s', upper(p_name));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.create_inventory_document(
  p_tenant_id uuid,
  p_document_type text,
  p_idempotency_key text,
  p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_document_id uuid;
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_source_location_id uuid;
  v_destination_location_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM erp_lab.tenants WHERE id = p_tenant_id)
     OR p_document_type NOT IN ('receipt', 'shipment', 'transfer', 'adjustment_in', 'adjustment_out')
     OR p_idempotency_key IS NULL OR btrim(p_idempotency_key) = ''
     OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_INPUT';
  END IF;

  SELECT id INTO v_document_id
    FROM erp_lab.inventory_documents
    WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_document_id;
  END IF;

  INSERT INTO erp_lab.inventory_documents(id, tenant_id, document_type, status, idempotency_key)
  VALUES (gen_random_uuid(), p_tenant_id, p_document_type, 'DRAFT', p_idempotency_key)
  RETURNING id INTO v_document_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    BEGIN
      v_product_id := (v_line->>'product_id')::uuid;
      v_quantity := (v_line->>'quantity')::numeric;
      v_source_location_id := NULLIF(v_line->>'source_location_id', '')::uuid;
      v_destination_location_id := NULLIF(v_line->>'destination_location_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_LINE';
    END;

    IF v_quantity IS NULL OR v_quantity <= 0
       OR NOT EXISTS (
         SELECT 1 FROM erp_lab.products WHERE id = v_product_id AND tenant_id = p_tenant_id
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_LINE';
    END IF;

    IF p_document_type IN ('receipt', 'adjustment_in') THEN
      PERFORM erp_lab.assert_location_in_tenant(v_destination_location_id, p_tenant_id, 'DESTINATION_LOCATION');
      IF v_source_location_id IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_LINE';
      END IF;
    ELSIF p_document_type IN ('shipment', 'adjustment_out') THEN
      PERFORM erp_lab.assert_location_in_tenant(v_source_location_id, p_tenant_id, 'SOURCE_LOCATION');
      IF v_destination_location_id IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_LINE';
      END IF;
    ELSE
      PERFORM erp_lab.assert_location_in_tenant(v_source_location_id, p_tenant_id, 'SOURCE_LOCATION');
      PERFORM erp_lab.assert_location_in_tenant(v_destination_location_id, p_tenant_id, 'DESTINATION_LOCATION');
      IF v_source_location_id = v_destination_location_id THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_LINE';
      END IF;
    END IF;

    INSERT INTO erp_lab.inventory_document_lines(
      id, document_id, product_id, quantity, source_location_id, destination_location_id
    ) VALUES (
      gen_random_uuid(), v_document_id, v_product_id, v_quantity,
      v_source_location_id, v_destination_location_id
    );
  END LOOP;

  RETURN v_document_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_document_id
    FROM erp_lab.inventory_documents
    WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  RETURN v_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.confirm_inventory_document(
  p_document_id uuid,
  p_tenant_id uuid
) RETURNS text
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
    FROM erp_lab.inventory_documents
    WHERE id = p_document_id AND tenant_id = p_tenant_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DOCUMENT_NOT_FOUND';
  END IF;
  IF v_status = 'CONFIRMED' THEN
    RETURN v_status;
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_STATUS';
  END IF;

  UPDATE erp_lab.inventory_documents SET status = 'CONFIRMED' WHERE id = p_document_id;
  RETURN 'CONFIRMED';
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.create_reversal_document(
  p_reversed_document_id uuid,
  p_tenant_id uuid,
  p_idempotency_key text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_document_id uuid;
  v_original erp_lab.inventory_documents%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVERSAL_INPUT';
  END IF;

  SELECT id INTO v_document_id
    FROM erp_lab.inventory_documents
   WHERE tenant_id = p_tenant_id
     AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_document_id;
  END IF;

  SELECT * INTO v_original
    FROM erp_lab.inventory_documents
   WHERE id = p_reversed_document_id
     AND tenant_id = p_tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DOCUMENT_NOT_FOUND';
  END IF;
  IF EXISTS (
    SELECT 1 FROM erp_lab.inventory_documents
     WHERE reversed_document_id = p_reversed_document_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REVERSAL_ALREADY_EXISTS';
  END IF;
  IF EXISTS (
    SELECT 1 FROM erp_lab.inventory_documents
     WHERE source_document_id = p_reversed_document_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DOCUMENT_HAS_RETURNS';
  END IF;
  IF v_original.status <> 'POSTED' OR v_original.document_type = 'reversal' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVERSAL_SOURCE';
  END IF;

  BEGIN
    INSERT INTO erp_lab.inventory_documents(
      id, tenant_id, document_type, status, idempotency_key, reversed_document_id
    ) VALUES (
      gen_random_uuid(), p_tenant_id, 'reversal', 'DRAFT', p_idempotency_key, p_reversed_document_id
    ) RETURNING id INTO v_document_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REVERSAL_ALREADY_EXISTS';
  END;

  INSERT INTO erp_lab.inventory_document_lines(
    id, document_id, product_id, quantity, source_location_id, destination_location_id
  )
  SELECT
    gen_random_uuid(), v_document_id, product_id, quantity, source_location_id, destination_location_id
  FROM erp_lab.inventory_document_lines
  WHERE document_id = p_reversed_document_id;

  RETURN v_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.create_return_document(
  p_source_document_id uuid,
  p_tenant_id uuid,
  p_idempotency_key text,
  p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_document_id uuid;
  v_source_document erp_lab.inventory_documents%ROWTYPE;
  v_line jsonb;
  v_source_line_id uuid;
  v_product_id uuid;
  v_quantity numeric;
  v_destination_location_id uuid;
  v_already_returned numeric;
  v_source_quantity numeric;
BEGIN
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = ''
     OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETURN_INPUT';
  END IF;

  SELECT id INTO v_document_id
    FROM erp_lab.inventory_documents
   WHERE tenant_id = p_tenant_id
     AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_document_id;
  END IF;

  SELECT * INTO v_source_document
    FROM erp_lab.inventory_documents
   WHERE id = p_source_document_id
     AND tenant_id = p_tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DOCUMENT_NOT_FOUND';
  END IF;
  IF v_source_document.document_type <> 'shipment' OR v_source_document.status <> 'POSTED' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETURN_SOURCE';
  END IF;

  INSERT INTO erp_lab.inventory_documents(
    id, tenant_id, document_type, status, idempotency_key, source_document_id
  ) VALUES (
    gen_random_uuid(), p_tenant_id, 'return', 'DRAFT', p_idempotency_key, p_source_document_id
  ) RETURNING id INTO v_document_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    BEGIN
      v_source_line_id := (v_line->>'source_document_line_id')::uuid;
      v_quantity := (v_line->>'quantity')::numeric;
      v_destination_location_id := NULLIF(v_line->>'destination_location_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETURN_LINE';
    END;

    SELECT product_id, quantity INTO v_product_id, v_source_quantity
      FROM erp_lab.inventory_document_lines
     WHERE id = v_source_line_id
       AND document_id = p_source_document_id;
    IF NOT FOUND OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETURN_LINE';
    END IF;
    PERFORM erp_lab.assert_location_in_tenant(v_destination_location_id, p_tenant_id, 'DESTINATION_LOCATION');

    SELECT COALESCE(SUM(return_line.quantity), 0) INTO v_already_returned
      FROM erp_lab.inventory_document_lines AS return_line
      JOIN erp_lab.inventory_documents AS return_document ON return_document.id = return_line.document_id
     WHERE return_document.document_type = 'return'
       AND return_line.source_document_line_id = v_source_line_id;
    IF v_already_returned + v_quantity > v_source_quantity THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RETURN_QUANTITY_EXCEEDED';
    END IF;

    INSERT INTO erp_lab.inventory_document_lines(
      id, document_id, product_id, quantity, destination_location_id, source_document_line_id
    ) VALUES (
      gen_random_uuid(), v_document_id, v_product_id, v_quantity, v_destination_location_id, v_source_line_id
    );
  END LOOP;

  RETURN v_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.bulk_receipt_documents(
  p_tenant_id uuid,
  p_rows jsonb
) RETURNS TABLE(row_index integer, status text, document_id uuid, error_code text)
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_row jsonb;
  v_index bigint;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BULK_RECEIPT_INPUT';
  END IF;

  FOR v_row, v_index IN
    SELECT value, ordinality FROM jsonb_array_elements(p_rows) WITH ORDINALITY
  LOOP
    row_index := v_index;
    document_id := NULL;
    error_code := NULL;
    BEGIN
      document_id := erp_lab.create_inventory_document(
        p_tenant_id, 'receipt', v_row->>'idempotency_key', v_row->'lines'
      );
      PERFORM erp_lab.confirm_inventory_document(document_id, p_tenant_id);
      PERFORM erp_lab.post_confirmed_document(document_id, p_tenant_id);
      status := 'POSTED';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_code = RETURNED_SQLSTATE;
      status := 'REJECTED';
      document_id := NULL;
    END;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.lock_balance_key(
  p_tenant_id uuid,
  p_product_id uuid,
  p_location_id uuid
) RETURNS void
LANGUAGE sql
SET search_path = erp_lab, public
AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_product_id::text || ':' || p_location_id::text, 0));
$$;

CREATE OR REPLACE FUNCTION erp_lab.apply_balance_delta(
  p_tenant_id uuid,
  p_product_id uuid,
  p_location_id uuid,
  p_delta numeric
) RETURNS void
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
BEGIN
  UPDATE erp_lab.inventory_balances
     SET quantity = quantity + p_delta,
         version = version + 1
   WHERE tenant_id = p_tenant_id
     AND product_id = p_product_id
     AND location_id = p_location_id
     AND quantity + p_delta >= 0;

  IF FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM erp_lab.inventory_balances
     WHERE tenant_id = p_tenant_id
       AND product_id = p_product_id
       AND location_id = p_location_id
  ) OR p_delta < 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_STOCK';
  END IF;

  INSERT INTO erp_lab.inventory_balances(tenant_id, product_id, location_id, quantity)
  VALUES (p_tenant_id, p_product_id, p_location_id, p_delta);
END;
$$;

CREATE OR REPLACE FUNCTION erp_lab.post_confirmed_document(
  p_document_id uuid,
  p_tenant_id uuid
) RETURNS text
LANGUAGE plpgsql
SET search_path = erp_lab, public
AS $$
DECLARE
  v_document erp_lab.inventory_documents%ROWTYPE;
  v_line erp_lab.inventory_document_lines%ROWTYPE;
  v_lock record;
  v_delay_ms integer;
  v_effective_document_type text;
  v_reversal_multiplier integer := 1;
BEGIN
  SELECT * INTO v_document
    FROM erp_lab.inventory_documents
    WHERE id = p_document_id AND tenant_id = p_tenant_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DOCUMENT_NOT_FOUND';
  END IF;
  IF v_document.status = 'POSTED' THEN
    RETURN 'POSTED';
  END IF;
  IF v_document.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DOCUMENT_STATUS';
  END IF;

  v_effective_document_type := v_document.document_type;
  IF v_document.document_type = 'reversal' THEN
    SELECT document_type INTO v_effective_document_type
      FROM erp_lab.inventory_documents
     WHERE id = v_document.reversed_document_id
       AND tenant_id = p_tenant_id
     FOR UPDATE;
    IF NOT FOUND OR v_effective_document_type = 'reversal' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVERSAL_SOURCE';
    END IF;
    v_reversal_multiplier := -1;
  ELSIF v_document.document_type = 'return' THEN
    PERFORM 1
      FROM erp_lab.inventory_documents
     WHERE id = v_document.source_document_id
       AND tenant_id = p_tenant_id
       AND document_type = 'shipment'
       AND status = 'POSTED'
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETURN_SOURCE';
    END IF;
  END IF;

  FOR v_lock IN
    SELECT product_id, location_id
      FROM (
        SELECT product_id, source_location_id AS location_id
          FROM erp_lab.inventory_document_lines
         WHERE document_id = p_document_id
           AND source_location_id IS NOT NULL
        UNION
        SELECT product_id, destination_location_id AS location_id
          FROM erp_lab.inventory_document_lines
         WHERE document_id = p_document_id
           AND destination_location_id IS NOT NULL
      ) AS balance_keys
     ORDER BY product_id, location_id
  LOOP
    PERFORM erp_lab.lock_balance_key(p_tenant_id, v_lock.product_id, v_lock.location_id);
  END LOOP;

  v_delay_ms := NULLIF(current_setting('erp_lab.test_post_lock_delay_ms', true), '')::integer;
  IF v_delay_ms IS NOT NULL AND v_delay_ms > 0 THEN
    PERFORM pg_sleep(v_delay_ms / 1000.0);
  END IF;

  FOR v_line IN
    SELECT * FROM erp_lab.inventory_document_lines
    WHERE document_id = p_document_id
    ORDER BY product_id, LEAST(COALESCE(source_location_id, destination_location_id), COALESCE(destination_location_id, source_location_id))
  LOOP
    IF v_effective_document_type IN ('receipt', 'return', 'adjustment_in') THEN
      PERFORM erp_lab.apply_balance_delta(p_tenant_id, v_line.product_id, v_line.destination_location_id, v_line.quantity * v_reversal_multiplier);
      INSERT INTO erp_lab.stock_ledger(tenant_id, document_id, document_line_id, product_id, location_id, quantity_delta)
      VALUES (p_tenant_id, p_document_id, v_line.id, v_line.product_id, v_line.destination_location_id, v_line.quantity * v_reversal_multiplier);
    ELSIF v_effective_document_type IN ('shipment', 'adjustment_out') THEN
      PERFORM erp_lab.apply_balance_delta(p_tenant_id, v_line.product_id, v_line.source_location_id, -v_line.quantity * v_reversal_multiplier);
      INSERT INTO erp_lab.stock_ledger(tenant_id, document_id, document_line_id, product_id, location_id, quantity_delta)
      VALUES (p_tenant_id, p_document_id, v_line.id, v_line.product_id, v_line.source_location_id, -v_line.quantity * v_reversal_multiplier);
    ELSE
      PERFORM erp_lab.apply_balance_delta(p_tenant_id, v_line.product_id, v_line.source_location_id, -v_line.quantity * v_reversal_multiplier);
      PERFORM erp_lab.apply_balance_delta(p_tenant_id, v_line.product_id, v_line.destination_location_id, v_line.quantity * v_reversal_multiplier);
      INSERT INTO erp_lab.stock_ledger(tenant_id, document_id, document_line_id, product_id, location_id, quantity_delta)
      VALUES
        (p_tenant_id, p_document_id, v_line.id, v_line.product_id, v_line.source_location_id, -v_line.quantity * v_reversal_multiplier),
        (p_tenant_id, p_document_id, v_line.id, v_line.product_id, v_line.destination_location_id, v_line.quantity * v_reversal_multiplier);
    END IF;
  END LOOP;

  UPDATE erp_lab.inventory_documents SET status = 'POSTED' WHERE id = p_document_id;
  IF v_document.document_type = 'reversal' THEN
    UPDATE erp_lab.inventory_documents
       SET status = 'REVERSED'
     WHERE id = v_document.reversed_document_id;
  END IF;
  RETURN 'POSTED';
END;
$$;

CREATE OR REPLACE VIEW erp_lab.balance_reconciliation AS
WITH ledger_totals AS (
  SELECT tenant_id, product_id, location_id, SUM(quantity_delta) AS ledger_quantity
  FROM erp_lab.stock_ledger
  GROUP BY tenant_id, product_id, location_id
), keys AS (
  SELECT tenant_id, product_id, location_id FROM ledger_totals
  UNION
  SELECT tenant_id, product_id, location_id FROM erp_lab.inventory_balances
)
SELECT
  keys.tenant_id,
  keys.product_id,
  keys.location_id,
  COALESCE(ledger_totals.ledger_quantity, 0) AS ledger_quantity,
  COALESCE(inventory_balances.quantity, 0) AS balance_quantity,
  COALESCE(ledger_totals.ledger_quantity, 0) = COALESCE(inventory_balances.quantity, 0) AS is_reconciled
FROM keys
LEFT JOIN ledger_totals USING (tenant_id, product_id, location_id)
LEFT JOIN erp_lab.inventory_balances USING (tenant_id, product_id, location_id);
