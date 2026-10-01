-- DB-authoritative inventory mutations. Operational movement uses deltas;
-- intentional absolute corrections use an auditable expected-version contract.
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.inventory_bump_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_bump_version_on_update ON public.inventory;
CREATE TRIGGER inventory_bump_version_on_update
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.inventory_bump_version();

CREATE TABLE IF NOT EXISTS public.inventory_adjustment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.inventory(id),
  product_option_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  old_quantity numeric,
  new_quantity numeric,
  old_weight_in_grams integer,
  new_weight_in_grams integer,
  expected_version bigint NOT NULL,
  applied_version bigint NOT NULL,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.apply_inventory_delta(
  p_product_option_id uuid,
  p_warehouse_id uuid,
  p_quantity_delta numeric DEFAULT NULL,
  p_weight_delta integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product_type text;
  v_id uuid;
  v_quantity numeric;
  v_weight integer;
  v_version bigint;
BEGIN
  IF (p_quantity_delta IS NULL) = (p_weight_delta IS NULL)
     OR COALESCE(p_quantity_delta, p_weight_delta::numeric) = 0
     OR COALESCE(p_quantity_delta::text, '') IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVENTORY_DELTA';
  END IF;

  SELECT p.product_type INTO v_product_type
    FROM public.product_options o JOIN public.products p ON p.id = o.product_id
    WHERE o.id = p_product_option_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'PRODUCT_OPTION_NOT_FOUND';
  END IF;
  IF (v_product_type = 'material' AND p_weight_delta IS NULL)
     OR (v_product_type <> 'material' AND p_quantity_delta IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_UNIT_MISMATCH';
  END IF;

  -- The same pair key used by create_transaction serializes missing-row choice.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_option_id::text || ':' || p_warehouse_id::text, 0));

  IF p_quantity_delta IS NOT NULL THEN
    UPDATE public.inventory
      SET quantity = quantity + p_quantity_delta, updated_at = now()
      WHERE product_option_id = p_product_option_id AND warehouse_id = p_warehouse_id
        AND quantity IS NOT NULL AND quantity >= 0
        AND quantity + p_quantity_delta >= 0
      RETURNING id, quantity, version INTO v_id, v_quantity, v_version;
  ELSE
    UPDATE public.inventory
      SET weight_in_grams = (weight_in_grams::bigint + p_weight_delta)::integer, updated_at = now()
      WHERE product_option_id = p_product_option_id AND warehouse_id = p_warehouse_id
        AND weight_in_grams IS NOT NULL AND weight_in_grams >= 0
        AND weight_in_grams::bigint + p_weight_delta >= 0
        AND weight_in_grams::bigint + p_weight_delta <= 2147483647
      RETURNING id, weight_in_grams, version INTO v_id, v_weight, v_version;
  END IF;
  IF FOUND THEN
    RETURN jsonb_build_object('inventory_id', v_id, 'version', v_version);
  END IF;

  SELECT id, quantity, weight_in_grams INTO v_id, v_quantity, v_weight
    FROM public.inventory
    WHERE product_option_id = p_product_option_id AND warehouse_id = p_warehouse_id;
  IF FOUND THEN
    IF (p_quantity_delta IS NOT NULL AND v_quantity IS NULL)
       OR (p_weight_delta IS NOT NULL AND v_weight IS NULL) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_UNIT_MISMATCH';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_STOCK';
  END IF;

  IF COALESCE(p_quantity_delta, p_weight_delta::numeric) < 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'INVENTORY_NOT_FOUND';
  END IF;

  INSERT INTO public.inventory(product_option_id, warehouse_id, quantity, weight_in_grams, version)
  VALUES (p_product_option_id, p_warehouse_id,
          CASE WHEN p_quantity_delta IS NOT NULL THEN p_quantity_delta END,
          CASE WHEN p_weight_delta IS NOT NULL THEN p_weight_delta END, 0)
  RETURNING id, version INTO v_id, v_version;
  RETURN jsonb_build_object('inventory_id', v_id, 'version', v_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_inventory_adjustment(
  p_product_option_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric DEFAULT NULL,
  p_weight integer DEFAULT NULL,
  p_expected_version bigint DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product_type text;
  v_id uuid;
  v_old_quantity numeric;
  v_old_weight integer;
  v_version bigint;
  v_applied_version bigint;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 0
     OR p_reason IS NULL OR btrim(p_reason) = ''
     OR (p_quantity IS NULL) = (p_weight IS NULL)
     OR COALESCE(p_quantity::text, '') IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INVENTORY_ADJUSTMENT';
  END IF;

  SELECT p.product_type INTO v_product_type
    FROM public.product_options o JOIN public.products p ON p.id = o.product_id
    WHERE o.id = p_product_option_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'PRODUCT_OPTION_NOT_FOUND';
  END IF;
  IF (v_product_type = 'material' AND p_weight IS NULL)
     OR (v_product_type <> 'material' AND p_quantity IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_UNIT_MISMATCH';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_option_id::text || ':' || p_warehouse_id::text, 0));
  SELECT id, quantity, weight_in_grams, version
    INTO v_id, v_old_quantity, v_old_weight, v_version
    FROM public.inventory
    WHERE product_option_id = p_product_option_id AND warehouse_id = p_warehouse_id
    FOR UPDATE;

  IF FOUND THEN
    IF v_version <> p_expected_version THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_ADJUSTMENT_CONFLICT';
    END IF;
    IF (p_quantity IS NOT NULL AND v_old_quantity IS NULL)
       OR (p_weight IS NOT NULL AND v_old_weight IS NULL) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_UNIT_MISMATCH';
    END IF;
    UPDATE public.inventory
      SET quantity = CASE WHEN p_quantity IS NOT NULL THEN p_quantity ELSE quantity END,
          weight_in_grams = CASE WHEN p_weight IS NOT NULL THEN p_weight ELSE weight_in_grams END,
          updated_at = now()
      WHERE id = v_id AND version = p_expected_version
      RETURNING version INTO v_applied_version;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_ADJUSTMENT_CONFLICT';
    END IF;
  ELSE
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVENTORY_ADJUSTMENT_CONFLICT';
    END IF;
    INSERT INTO public.inventory(product_option_id, warehouse_id, quantity, weight_in_grams, version)
    VALUES (p_product_option_id, p_warehouse_id, p_quantity, p_weight, 0)
    RETURNING id, version INTO v_id, v_applied_version;
  END IF;

  INSERT INTO public.inventory_adjustment_audit(
    inventory_id, product_option_id, warehouse_id, old_quantity, new_quantity,
    old_weight_in_grams, new_weight_in_grams, expected_version, applied_version,
    reason, actor_id
  ) VALUES (
    v_id, p_product_option_id, p_warehouse_id, v_old_quantity, p_quantity,
    v_old_weight, p_weight, p_expected_version, v_applied_version,
    btrim(p_reason), p_actor_id
  );
  RETURN jsonb_build_object('inventory_id', v_id, 'version', v_applied_version);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_inventory_adjustment(uuid, uuid, numeric, integer, bigint, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_inventory_adjustment(uuid, uuid, numeric, integer, bigint, text, uuid) TO authenticated;
REVOKE ALL ON TABLE public.inventory_adjustment_audit FROM PUBLIC;

COMMENT ON FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer) IS
  'Server-owned current-value inventory delta. Movement callers must not read and write an absolute value.';
COMMENT ON FUNCTION public.apply_inventory_adjustment(uuid, uuid, numeric, integer, bigint, text, uuid) IS
  'Audited absolute inventory correction. Requires nonblank reason and matching expected version; stale correction raises INVENTORY_ADJUSTMENT_CONFLICT.';
