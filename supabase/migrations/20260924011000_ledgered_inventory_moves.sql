-- A move is a canonical transaction plus two inventory deltas in one database
-- transaction. Do not retain an authenticated unledgered delta entrypoint.
REVOKE ALL ON FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer) FROM authenticated;
DROP FUNCTION public.apply_inventory_delta(uuid, uuid, numeric, integer);

CREATE OR REPLACE FUNCTION public.create_inventory_move(p_header jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_transaction_id uuid;
  v_from_warehouse_id uuid;
  v_to_warehouse_id uuid;
  v_user_id uuid;
  v_created_at timestamptz;
  v_item jsonb;
  v_option_id uuid;
  v_qty numeric;
  v_product_type text;
  v_source_id uuid;
  v_target_id uuid;
  v_source_quantity numeric;
  v_source_weight integer;
  v_target_quantity numeric;
  v_target_weight integer;
  v_updated uuid;
  v_first_lock bigint;
  v_second_lock bigint;
BEGIN
  IF jsonb_typeof(p_header) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MOVE_INPUT';
  END IF;
  BEGIN
    v_from_warehouse_id := (p_header->>'from_warehouse_id')::uuid;
    v_to_warehouse_id := (p_header->>'to_warehouse_id')::uuid;
    v_user_id := (p_header->>'user_id')::uuid;
    v_created_at := COALESCE((p_header->>'created_at')::timestamptz, now());
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) AS e(item)
      WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
         OR item->>'option_id' IS NULL
         OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number'
    ) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) AS e(item)
      GROUP BY (item->>'option_id')::uuid HAVING count(*) > 1
    ) THEN
      RAISE invalid_parameter_value;
    END IF;
  EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value
      OR invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MOVE_INPUT';
  END;
  IF v_from_warehouse_id IS NULL OR v_to_warehouse_id IS NULL OR v_user_id IS NULL
     OR v_from_warehouse_id = v_to_warehouse_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MOVE_INPUT';
  END IF;

  INSERT INTO public.transactions(type, user_id, memo, created_at, from_warehouse_id, to_warehouse_id)
  VALUES ('move', v_user_id, COALESCE(p_header->>'memo', ''), v_created_at,
          v_from_warehouse_id, v_to_warehouse_id)
  RETURNING id INTO v_transaction_id;

  -- Product-option order then pair-key order prevents opposite move deadlocks.
  FOR v_item IN SELECT item FROM jsonb_array_elements(p_items) AS e(item)
                ORDER BY (item->>'option_id')::uuid
  LOOP
    v_option_id := (v_item->>'option_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    SELECT p.product_type INTO v_product_type
      FROM public.product_options o JOIN public.products p ON p.id = o.product_id
      WHERE o.id = v_option_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'PRODUCT_OPTION_NOT_FOUND';
    END IF;
    IF v_qty <= 0 OR v_product_type NOT IN ('company', 'franchise', 'pb', 'material')
       OR (v_item ? 'product_type' AND (v_item->>'product_type') IS DISTINCT FROM v_product_type)
       OR (v_product_type = 'material' AND (v_qty <> trunc(v_qty) OR v_qty > 2147483647)) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MOVE_INPUT';
    END IF;

    v_first_lock := hashtextextended(v_option_id::text || ':' || LEAST(v_from_warehouse_id, v_to_warehouse_id)::text, 0);
    v_second_lock := hashtextextended(v_option_id::text || ':' || GREATEST(v_from_warehouse_id, v_to_warehouse_id)::text, 0);
    PERFORM pg_advisory_xact_lock(v_first_lock);
    PERFORM pg_advisory_xact_lock(v_second_lock);

    SELECT id, quantity, weight_in_grams
      INTO v_source_id, v_source_quantity, v_source_weight
      FROM public.inventory
      WHERE product_option_id = v_option_id AND warehouse_id = v_from_warehouse_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'INVENTORY_NOT_FOUND';
    END IF;
    IF (v_product_type = 'material' AND (v_source_weight IS NULL OR v_source_weight < 0 OR COALESCE(v_source_quantity, 0) <> 0))
       OR (v_product_type <> 'material' AND (v_source_quantity IS NULL OR v_source_quantity < 0
           OR v_source_quantity::text IN ('NaN', 'Infinity', '-Infinity') OR COALESCE(v_source_weight, 0) <> 0)) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0003', MESSAGE = 'INVALID_INVENTORY_STATE';
    END IF;

    v_updated := NULL;
    IF v_product_type = 'material' THEN
      UPDATE public.inventory
        SET weight_in_grams = (weight_in_grams::bigint - v_qty)::integer, updated_at = now()
        WHERE id = v_source_id AND weight_in_grams >= v_qty
        RETURNING id INTO v_updated;
    ELSE
      UPDATE public.inventory
        SET quantity = quantity - v_qty, updated_at = now()
        WHERE id = v_source_id AND quantity >= v_qty
        RETURNING id INTO v_updated;
    END IF;
    IF v_updated IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_STOCK';
    END IF;

    SELECT id, quantity, weight_in_grams
      INTO v_target_id, v_target_quantity, v_target_weight
      FROM public.inventory
      WHERE product_option_id = v_option_id AND warehouse_id = v_to_warehouse_id;
    IF FOUND THEN
      IF (v_product_type = 'material' AND (v_target_weight IS NULL OR COALESCE(v_target_quantity, 0) <> 0))
         OR (v_product_type <> 'material' AND (v_target_quantity IS NULL OR COALESCE(v_target_weight, 0) <> 0)) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_UNIT_MISMATCH';
      END IF;
      v_updated := NULL;
      IF v_product_type = 'material' THEN
        UPDATE public.inventory
          SET weight_in_grams = (weight_in_grams::bigint + v_qty)::integer, updated_at = now()
          WHERE id = v_target_id AND weight_in_grams::bigint + v_qty <= 2147483647
          RETURNING id INTO v_updated;
      ELSE
        UPDATE public.inventory
          SET quantity = quantity + v_qty, updated_at = now()
          WHERE id = v_target_id
          RETURNING id INTO v_updated;
      END IF;
      IF v_updated IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVENTORY_CAPACITY_EXCEEDED';
      END IF;
    ELSE
      INSERT INTO public.inventory(product_option_id, warehouse_id, quantity, weight_in_grams)
      VALUES (v_option_id, v_to_warehouse_id,
              CASE WHEN v_product_type <> 'material' THEN v_qty END,
              CASE WHEN v_product_type = 'material' THEN v_qty::integer END);
    END IF;

    INSERT INTO public.transaction_items(transaction_id, product_option_id, quantity)
    VALUES (v_transaction_id, v_option_id, v_qty);
  END LOOP;
  RETURN jsonb_build_object('transaction_id', v_transaction_id, 'success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_move(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_move(jsonb, jsonb) TO authenticated;
COMMENT ON FUNCTION public.create_inventory_move(jsonb, jsonb) IS
  'Canonical ledgered move: transaction(type=move), transaction items, source decrement, and destination increment commit or roll back together.';
