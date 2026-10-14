-- Approval-gated inventory documents keep unreflected intent separate from the
-- existing transactions/inventory ledger. Only approve-and-reflect can create
-- the canonical inventory transaction for a submitted document.

CREATE TABLE public.approval_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('approver')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE public.inventory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('in', 'out')),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'REFLECTED', 'REJECTED', 'CANCELLED')),
  requester_id uuid NOT NULL REFERENCES auth.users(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  memo text NOT NULL DEFAULT '',
  idempotency_key uuid NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  requested_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  reflected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  transaction_id uuid UNIQUE REFERENCES public.transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, idempotency_key),
  CHECK (
    (status = 'REJECTED' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL
      AND rejection_reason IS NOT NULL AND btrim(rejection_reason) <> '')
    OR status <> 'REJECTED'
  ),
  CHECK (
    (status = 'REFLECTED' AND approved_by IS NOT NULL AND reflected_at IS NOT NULL
      AND transaction_id IS NOT NULL)
    OR status <> 'REFLECTED'
  )
);

CREATE TABLE public.inventory_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.inventory_documents(id) ON DELETE CASCADE,
  product_option_id uuid NOT NULL REFERENCES public.product_options(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, product_option_id)
);

CREATE TABLE public.inventory_document_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.inventory_documents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('CREATED', 'SUBMITTED', 'APPROVED_AND_REFLECTED', 'REJECTED', 'CANCELLED')),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_documents_status_created_at_idx
  ON public.inventory_documents(status, created_at DESC);
CREATE INDEX inventory_document_lines_document_id_idx
  ON public.inventory_document_lines(document_id);
CREATE INDEX inventory_document_audit_document_id_created_at_idx
  ON public.inventory_document_audit(document_id, created_at);

ALTER TABLE public.approval_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_document_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_roles_read_own ON public.approval_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY inventory_documents_read_requester_or_approver ON public.inventory_documents
  FOR SELECT TO authenticated USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.approval_roles
      WHERE user_id = auth.uid() AND role = 'approver'
    )
  );

CREATE POLICY inventory_document_lines_read_visible_document ON public.inventory_document_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.inventory_documents d
      WHERE d.id = document_id
        AND (
          d.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.approval_roles
            WHERE user_id = auth.uid() AND role = 'approver'
          )
        )
    )
  );

CREATE POLICY inventory_document_audit_read_visible_document ON public.inventory_document_audit
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.inventory_documents d
      WHERE d.id = document_id
        AND (
          d.requester_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.approval_roles
            WHERE user_id = auth.uid() AND role = 'approver'
          )
        )
    )
  );

REVOKE ALL ON TABLE public.approval_roles, public.inventory_documents,
  public.inventory_document_lines, public.inventory_document_audit FROM PUBLIC;
REVOKE ALL ON TABLE public.approval_roles, public.inventory_documents,
  public.inventory_document_lines, public.inventory_document_audit FROM authenticated;
GRANT SELECT ON TABLE public.approval_roles, public.inventory_documents,
  public.inventory_document_lines, public.inventory_document_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.create_inventory_document(p_header jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document_id uuid;
  v_document_type text;
  v_warehouse_id uuid;
  v_supplier_id uuid;
  v_idempotency_key uuid;
  v_effective_at timestamptz;
  v_item jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF jsonb_typeof(p_header) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVENTORY_DOCUMENT_INPUT';
  END IF;

  BEGIN
    v_document_type := lower(p_header->>'document_type');
    v_warehouse_id := (p_header->>'warehouse_id')::uuid;
    v_supplier_id := NULLIF(p_header->>'supplier_id', '')::uuid;
    v_idempotency_key := (p_header->>'idempotency_key')::uuid;
    v_effective_at := COALESCE((p_header->>'effective_at')::timestamptz, now());
    IF v_document_type NOT IN ('in', 'out')
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) AS e(item)
         WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
            OR item->>'option_id' IS NULL
            OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number'
            OR (item->>'quantity')::numeric <= 0
       )
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) AS e(item)
         GROUP BY (item->>'option_id')::uuid HAVING count(*) > 1
       ) THEN
      RAISE invalid_parameter_value;
    END IF;
  EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVENTORY_DOCUMENT_INPUT';
  END;
  IF v_warehouse_id IS NULL OR v_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVENTORY_DOCUMENT_INPUT';
  END IF;

  INSERT INTO public.inventory_documents(
    document_type, requester_id, warehouse_id, supplier_id, memo, idempotency_key, effective_at
  ) VALUES (
    v_document_type, v_actor_id, v_warehouse_id, v_supplier_id,
    COALESCE(p_header->>'memo', ''), v_idempotency_key, v_effective_at
  )
  ON CONFLICT (requester_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_document_id;

  IF v_document_id IS NULL THEN
    SELECT id INTO v_document_id
      FROM public.inventory_documents
      WHERE requester_id = v_actor_id AND idempotency_key = v_idempotency_key;
    RETURN jsonb_build_object('document_id', v_document_id, 'idempotent_replay', true);
  END IF;

  FOR v_item IN SELECT item FROM jsonb_array_elements(p_items) AS e(item)
  LOOP
    INSERT INTO public.inventory_document_lines(document_id, product_option_id, quantity)
    VALUES (v_document_id, (v_item->>'option_id')::uuid, (v_item->>'quantity')::numeric);
  END LOOP;

  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id)
  VALUES (v_document_id, 'CREATED', v_actor_id);

  RETURN jsonb_build_object('document_id', v_document_id, 'idempotent_replay', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_inventory_document(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document public.inventory_documents%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  SELECT * INTO v_document FROM public.inventory_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND OR v_document.requester_id <> v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_NOT_REQUESTER';
  END IF;
  IF v_document.status = 'PENDING_APPROVAL' THEN
    RETURN jsonb_build_object('document_id', v_document.id, 'status', v_document.status, 'idempotent_replay', true);
  END IF;
  IF v_document.status <> 'DRAFT' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_DOCUMENT_NOT_SUBMITTABLE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inventory_document_lines WHERE document_id = v_document.id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_DOCUMENT_EMPTY';
  END IF;

  UPDATE public.inventory_documents
    SET status = 'PENDING_APPROVAL', requested_at = now(), updated_at = now()
    WHERE id = v_document.id;
  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id)
  VALUES (v_document.id, 'SUBMITTED', v_actor_id);
  RETURN jsonb_build_object('document_id', v_document.id, 'status', 'PENDING_APPROVAL', 'idempotent_replay', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_and_reflect_inventory_document(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document public.inventory_documents%ROWTYPE;
  v_items jsonb;
  v_transaction jsonb;
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
    RETURN jsonb_build_object(
      'document_id', v_document.id,
      'transaction_id', v_document.transaction_id,
      'status', v_document.status,
      'idempotent_replay', true
    );
  END IF;
  IF v_document.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_DOCUMENT_NOT_APPROVABLE';
  END IF;
  IF v_document.requester_id = v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_SELF_APPROVAL_FORBIDDEN';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object('option_id', product_option_id, 'quantity', quantity)
    ORDER BY product_option_id
  ) INTO v_items
  FROM public.inventory_document_lines
  WHERE document_id = v_document.id;

  v_transaction := public.create_transaction(
    jsonb_build_object(
      'type', v_document.document_type,
      'user_id', v_document.requester_id,
      'warehouse_id', v_document.warehouse_id,
      'supplier_id', v_document.supplier_id,
      'memo', v_document.memo,
      'created_at', v_document.effective_at
    ),
    v_items
  );

  UPDATE public.inventory_documents
    SET status = 'REFLECTED',
        approved_by = v_actor_id,
        reflected_at = now(),
        transaction_id = (v_transaction->>'transaction_id')::uuid,
        updated_at = now()
    WHERE id = v_document.id;
  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id, detail)
  VALUES (
    v_document.id, 'APPROVED_AND_REFLECTED', v_actor_id,
    jsonb_build_object('transaction_id', v_transaction->>'transaction_id')
  );

  RETURN jsonb_build_object(
    'document_id', v_document.id,
    'transaction_id', v_transaction->>'transaction_id',
    'status', 'REFLECTED',
    'idempotent_replay', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_inventory_document(p_document_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document public.inventory_documents%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.approval_roles WHERE user_id = v_actor_id AND role = 'approver'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_APPROVER_REQUIRED';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_DOCUMENT_REJECTION_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_document FROM public.inventory_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'INVENTORY_DOCUMENT_NOT_FOUND';
  END IF;
  IF v_document.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_DOCUMENT_NOT_REJECTABLE';
  END IF;
  IF v_document.requester_id = v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_SELF_APPROVAL_FORBIDDEN';
  END IF;

  UPDATE public.inventory_documents
    SET status = 'REJECTED',
        rejected_by = v_actor_id,
        rejected_at = now(),
        rejection_reason = btrim(p_reason),
        updated_at = now()
    WHERE id = v_document.id;
  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id, detail)
  VALUES (v_document.id, 'REJECTED', v_actor_id, jsonb_build_object('reason', btrim(p_reason)));
  RETURN jsonb_build_object('document_id', v_document.id, 'status', 'REJECTED');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_inventory_document(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_document public.inventory_documents%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  SELECT * INTO v_document FROM public.inventory_documents WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND OR v_document.requester_id <> v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVENTORY_DOCUMENT_NOT_REQUESTER';
  END IF;
  IF v_document.status = 'CANCELLED' THEN
    RETURN jsonb_build_object('document_id', v_document.id, 'status', v_document.status, 'idempotent_replay', true);
  END IF;
  IF v_document.status NOT IN ('DRAFT', 'PENDING_APPROVAL') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_DOCUMENT_NOT_CANCELLABLE';
  END IF;

  UPDATE public.inventory_documents
    SET status = 'CANCELLED', updated_at = now()
    WHERE id = v_document.id;
  INSERT INTO public.inventory_document_audit(document_id, event_type, actor_id)
  VALUES (v_document.id, 'CANCELLED', v_actor_id);
  RETURN jsonb_build_object('document_id', v_document.id, 'status', 'CANCELLED', 'idempotent_replay', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_document(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_inventory_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_and_reflect_inventory_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_inventory_document(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_inventory_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_document(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_inventory_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_and_reflect_inventory_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_inventory_document(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_inventory_document(uuid) TO authenticated;

COMMENT ON TABLE public.inventory_documents IS
  'Approval-gated in/out intent. This table never changes inventory directly.';
COMMENT ON FUNCTION public.approve_and_reflect_inventory_document(uuid) IS
  'Locks one pending document, requires a distinct approver, then calls canonical create_transaction in the same DB transaction. Replays by the same approver return the already reflected transaction.';

CREATE OR REPLACE FUNCTION public.list_inventory_documents()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'can_approve', EXISTS (
      SELECT 1 FROM public.approval_roles
      WHERE user_id = auth.uid() AND role = 'approver'
    ),
    'documents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'document_type', d.document_type,
          'status', d.status,
          'requester_id', d.requester_id,
          'warehouse_id', d.warehouse_id,
          'supplier_id', d.supplier_id,
          'memo', d.memo,
          'effective_at', d.effective_at,
          'requested_at', d.requested_at,
          'approved_by', d.approved_by,
          'reflected_at', d.reflected_at,
          'rejected_by', d.rejected_by,
          'rejected_at', d.rejected_at,
          'rejection_reason', d.rejection_reason,
          'transaction_id', d.transaction_id,
          'created_at', d.created_at,
          'lines', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'product_option_id', l.product_option_id,
                'quantity', l.quantity
              ) ORDER BY l.created_at, l.id
            )
            FROM public.inventory_document_lines l
            WHERE l.document_id = d.id
          ), '[]'::jsonb)
        ) ORDER BY d.created_at DESC
      )
      FROM public.inventory_documents d
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.list_inventory_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_inventory_documents() TO authenticated;

COMMENT ON FUNCTION public.list_inventory_documents() IS
  'Returns only inventory documents visible under table RLS, plus the caller approver capability.';
