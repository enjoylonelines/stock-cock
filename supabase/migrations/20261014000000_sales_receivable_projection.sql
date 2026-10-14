-- A bounded sales projection for approved outbound inventory documents.
-- It deliberately reuses the canonical inventory transaction and does not add
-- a second stock writer or any external ERP integration.

ALTER TABLE public.inventory_documents
  ADD COLUMN sales_amount numeric;

ALTER TABLE public.inventory_documents
  ADD CONSTRAINT inventory_documents_sales_out_fields
  CHECK (
    sales_amount IS NULL
    OR (document_type = 'out' AND supplier_id IS NOT NULL AND sales_amount > 0)
  ) NOT VALID;

CREATE TABLE public.sales_receivable_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_document_id uuid NOT NULL UNIQUE REFERENCES public.inventory_documents(id),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id),
  counterparty_id uuid NOT NULL REFERENCES public.suppliers(id),
  sales_amount numeric NOT NULL CHECK (sales_amount > 0),
  outstanding_amount numeric NOT NULL CHECK (outstanding_amount >= 0 AND outstanding_amount <= sales_amount),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_receivable_projections_counterparty_created_at_idx
  ON public.sales_receivable_projections(counterparty_id, created_at DESC);

ALTER TABLE public.sales_receivable_projections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_receivable_projections FROM PUBLIC;
REVOKE ALL ON TABLE public.sales_receivable_projections FROM authenticated;

CREATE POLICY sales_receivable_projections_read_visible_document
  ON public.sales_receivable_projections FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.inventory_documents d
      WHERE d.id = inventory_document_id
        AND (
          d.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.approval_roles
            WHERE user_id = auth.uid() AND role = 'approver'
          )
        )
    )
  );
GRANT SELECT ON TABLE public.sales_receivable_projections TO authenticated;

CREATE OR REPLACE FUNCTION public.create_sales_inventory_document(p_header jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_document public.inventory_documents%ROWTYPE;
  v_sales_amount numeric;
  v_document_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF jsonb_typeof(p_header) IS DISTINCT FROM 'object' OR lower(p_header->>'document_type') <> 'out' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SALES_DOCUMENT_INPUT';
  END IF;
  BEGIN
    v_sales_amount := (p_header->>'sales_amount')::numeric;
    IF v_sales_amount <= 0 OR NULLIF(p_header->>'supplier_id', '') IS NULL THEN
      RAISE invalid_parameter_value;
    END IF;
  EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SALES_DOCUMENT_INPUT';
  END;

  v_result := public.create_inventory_document(p_header, p_items);
  v_document_id := (v_result->>'document_id')::uuid;
  SELECT * INTO v_document FROM public.inventory_documents WHERE id = v_document_id FOR UPDATE;

  IF v_document.document_type <> 'out'
     OR v_document.supplier_id IS NULL
     OR (v_document.sales_amount IS NOT NULL AND v_document.sales_amount <> v_sales_amount) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SALES_DOCUMENT_IDEMPOTENCY_CONFLICT';
  END IF;
  IF v_document.sales_amount IS NULL THEN
    UPDATE public.inventory_documents SET sales_amount = v_sales_amount, updated_at = now()
      WHERE id = v_document_id;
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_and_reflect_inventory_document(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document public.inventory_documents%ROWTYPE;
  v_items jsonb;
  v_transaction jsonb;
  v_transaction_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.approval_roles WHERE user_id = v_actor_id AND role = 'approver'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_APPROVER_REQUIRED';
  END IF;
  SELECT * INTO v_document FROM public.inventory_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'INVENTORY_DOCUMENT_NOT_FOUND';
  END IF;
  IF v_document.status = 'REFLECTED' AND v_document.approved_by = v_actor_id THEN
    RETURN jsonb_build_object('document_id', v_document.id, 'transaction_id', v_document.transaction_id,
      'status', v_document.status, 'idempotent_replay', true);
  END IF;
  IF v_document.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_DOCUMENT_NOT_APPROVABLE';
  END IF;
  IF v_document.requester_id = v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_SELF_APPROVAL_FORBIDDEN';
  END IF;
  IF v_document.document_type = 'out' AND (v_document.supplier_id IS NULL OR v_document.sales_amount IS NULL OR v_document.sales_amount <= 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SALES_DOCUMENT_INPUT';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('option_id', product_option_id, 'quantity', quantity) ORDER BY product_option_id)
    INTO v_items FROM public.inventory_document_lines WHERE document_id = v_document.id;
  v_transaction := public.create_transaction(
    jsonb_build_object('type', v_document.document_type, 'user_id', v_document.requester_id,
      'warehouse_id', v_document.warehouse_id, 'supplier_id', v_document.supplier_id,
      'memo', v_document.memo, 'created_at', v_document.effective_at), v_items);
  v_transaction_id := (v_transaction->>'transaction_id')::uuid;
  IF v_document.document_type = 'out' THEN
    INSERT INTO public.sales_receivable_projections(
      inventory_document_id, transaction_id, counterparty_id, sales_amount, outstanding_amount
    ) VALUES (v_document.id, v_transaction_id, v_document.supplier_id, v_document.sales_amount, v_document.sales_amount);
  END IF;
  UPDATE public.inventory_documents SET status = 'REFLECTED', approved_by = v_actor_id,
      reflected_at = now(), transaction_id = v_transaction_id, updated_at = now() WHERE id = v_document.id;
  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id, detail)
    VALUES (v_document.id, 'APPROVED_AND_REFLECTED', v_actor_id,
      jsonb_build_object('transaction_id', v_transaction_id));
  RETURN jsonb_build_object('document_id', v_document.id, 'transaction_id', v_transaction_id,
    'status', 'REFLECTED', 'idempotent_replay', false);
END;
$$;

CREATE OR REPLACE VIEW public.sales_receivable_report AS
SELECT r.counterparty_id, count(*)::bigint AS open_document_count,
       sum(r.sales_amount) AS sales_amount, sum(r.outstanding_amount) AS outstanding_amount
FROM public.sales_receivable_projections r
GROUP BY r.counterparty_id;

CREATE OR REPLACE FUNCTION public.list_inventory_documents()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'can_approve', EXISTS (
      SELECT 1 FROM public.approval_roles WHERE user_id = auth.uid() AND role = 'approver'
    ),
    'documents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id, 'document_type', d.document_type, 'status', d.status,
          'requester_id', d.requester_id, 'warehouse_id', d.warehouse_id,
          'supplier_id', d.supplier_id, 'memo', d.memo, 'sales_amount', d.sales_amount,
          'effective_at', d.effective_at, 'requested_at', d.requested_at,
          'approved_by', d.approved_by, 'reflected_at', d.reflected_at,
          'rejected_by', d.rejected_by, 'rejected_at', d.rejected_at,
          'rejection_reason', d.rejection_reason, 'transaction_id', d.transaction_id,
          'created_at', d.created_at,
          'lines', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', l.id, 'product_option_id', l.product_option_id, 'quantity', l.quantity
            ) ORDER BY l.created_at, l.id)
            FROM public.inventory_document_lines l WHERE l.document_id = d.id
          ), '[]'::jsonb)
        ) ORDER BY d.created_at DESC
      ) FROM public.inventory_documents d
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.create_sales_inventory_document(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sales_inventory_document(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_inventory_documents() TO authenticated;
GRANT SELECT ON public.sales_receivable_report TO authenticated;

COMMENT ON TABLE public.sales_receivable_projections IS
  'One unpaid sales projection per reflected outbound inventory document. Payment, tax, accounting entries, and external sync are out of scope.';
