-- moves/adjustments 트랜잭션을 원자적으로 처리하는 RPC 함수 추가

-- create_move_transaction: 재고 이동을 원자적으로 처리
-- p_header: { from_warehouse_id, to_warehouse_id, user_id, memo?, created_at? }
-- p_items: [{ option_id, quantity, product_type? }]
CREATE OR REPLACE FUNCTION public.create_move_transaction(p_header jsonb, p_items jsonb[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_from_warehouse_id uuid;
  v_to_warehouse_id uuid;
  v_user_id uuid;
  v_memo text;
  v_created_at timestamptz;
  v_item jsonb;
  v_option_id uuid;
  v_qty numeric;
  v_product_type text;
  v_from_inv_id uuid;
  v_from_inv_quantity numeric;
  v_from_inv_weight_grams integer;
  v_to_inv_id uuid;
  v_to_inv_quantity numeric;
  v_to_inv_weight_grams integer;
BEGIN
  v_from_warehouse_id := (p_header->>'from_warehouse_id')::uuid;
  v_to_warehouse_id := (p_header->>'to_warehouse_id')::uuid;
  v_user_id := (p_header->>'user_id')::uuid;
  v_memo := (p_header->>'memo')::text;
  v_created_at := COALESCE((p_header->>'created_at')::timestamptz, now());

  IF v_from_warehouse_id = v_to_warehouse_id THEN
    RAISE EXCEPTION '출발지와 도착지는 같을 수 없습니다.';
  END IF;

  INSERT INTO public.transactions (type, user_id, memo, created_at, from_warehouse_id, to_warehouse_id)
  VALUES ('move', v_user_id, v_memo, v_created_at, v_from_warehouse_id, v_to_warehouse_id)
  RETURNING id INTO v_transaction_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_option_id := (v_item->>'option_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_product_type := COALESCE(v_item->>'product_type', 'company');

    -- 출발지 재고 조회 (FOR UPDATE로 동시성 제어)
    SELECT id, quantity, weight_in_grams
    INTO v_from_inv_id, v_from_inv_quantity, v_from_inv_weight_grams
    FROM public.inventory
    WHERE product_option_id = v_option_id AND warehouse_id = v_from_warehouse_id
    FOR UPDATE;

    -- 도착지 재고 조회 (FOR UPDATE로 동시성 제어)
    SELECT id, quantity, weight_in_grams
    INTO v_to_inv_id, v_to_inv_quantity, v_to_inv_weight_grams
    FROM public.inventory
    WHERE product_option_id = v_option_id AND warehouse_id = v_to_warehouse_id
    FOR UPDATE;

    IF v_product_type = 'material' THEN
      -- 출발지 차감
      IF v_from_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET weight_in_grams = COALESCE(v_from_inv_weight_grams, 0) - v_qty::integer, updated_at = now()
        WHERE id = v_from_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, weight_in_grams, quantity)
        VALUES (v_option_id, v_from_warehouse_id, -v_qty::integer, NULL);
      END IF;

      -- 도착지 추가
      IF v_to_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET weight_in_grams = COALESCE(v_to_inv_weight_grams, 0) + v_qty::integer, updated_at = now()
        WHERE id = v_to_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, weight_in_grams, quantity)
        VALUES (v_option_id, v_to_warehouse_id, v_qty::integer, NULL);
      END IF;
    ELSE
      -- 출발지 차감
      IF v_from_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET quantity = COALESCE(v_from_inv_quantity, 0) - v_qty, updated_at = now()
        WHERE id = v_from_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, quantity)
        VALUES (v_option_id, v_from_warehouse_id, -v_qty);
      END IF;

      -- 도착지 추가
      IF v_to_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET quantity = COALESCE(v_to_inv_quantity, 0) + v_qty, updated_at = now()
        WHERE id = v_to_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, quantity)
        VALUES (v_option_id, v_to_warehouse_id, v_qty);
      END IF;
    END IF;

    INSERT INTO public.transaction_items (transaction_id, product_option_id, quantity)
    VALUES (v_transaction_id, v_option_id, v_qty);
  END LOOP;

  RETURN jsonb_build_object('transaction_id', v_transaction_id, 'success', true);
END;
$$;

COMMENT ON FUNCTION public.create_move_transaction(jsonb, jsonb[]) IS
  '재고 이동을 원자적으로 처리. p_header: from_warehouse_id, to_warehouse_id, user_id, memo?, created_at?. p_items: [{ option_id, quantity, product_type? }]';

-- create_adjustment_transaction: 재고 조정을 원자적으로 처리
-- p_header: { warehouse_id, user_id, memo?, created_at? }
-- p_items: [{ option_id, quantity (목표 재고값), product_type? }]
CREATE OR REPLACE FUNCTION public.create_adjustment_transaction(p_header jsonb, p_items jsonb[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_warehouse_id uuid;
  v_user_id uuid;
  v_memo text;
  v_created_at timestamptz;
  v_item jsonb;
  v_option_id uuid;
  v_target_qty numeric;
  v_product_type text;
  v_inv_id uuid;
  v_inv_quantity numeric;
  v_inv_weight_grams integer;
  v_current_value numeric;
  v_adjustment_qty numeric;
BEGIN
  v_warehouse_id := (p_header->>'warehouse_id')::uuid;
  v_user_id := (p_header->>'user_id')::uuid;
  v_memo := (p_header->>'memo')::text;
  v_created_at := COALESCE((p_header->>'created_at')::timestamptz, now());

  INSERT INTO public.transactions (type, user_id, memo, created_at, to_warehouse_id)
  VALUES ('adjust', v_user_id, v_memo, v_created_at, v_warehouse_id)
  RETURNING id INTO v_transaction_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_option_id := (v_item->>'option_id')::uuid;
    v_target_qty := (v_item->>'quantity')::numeric;
    v_product_type := COALESCE(v_item->>'product_type', 'company');

    -- 현재 재고 조회 (FOR UPDATE로 race condition 방지)
    SELECT id, quantity, weight_in_grams
    INTO v_inv_id, v_inv_quantity, v_inv_weight_grams
    FROM public.inventory
    WHERE product_option_id = v_option_id AND warehouse_id = v_warehouse_id
    FOR UPDATE;

    IF v_product_type = 'material' THEN
      v_current_value := COALESCE(v_inv_weight_grams, 0);
      v_adjustment_qty := v_target_qty - v_current_value;

      IF v_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET weight_in_grams = v_target_qty::integer, quantity = NULL, updated_at = now()
        WHERE id = v_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, weight_in_grams, quantity)
        VALUES (v_option_id, v_warehouse_id, v_target_qty::integer, NULL);
      END IF;
    ELSE
      v_current_value := COALESCE(v_inv_quantity, 0);
      v_adjustment_qty := v_target_qty - v_current_value;

      IF v_inv_id IS NOT NULL THEN
        UPDATE public.inventory
        SET quantity = v_target_qty, updated_at = now()
        WHERE id = v_inv_id;
      ELSE
        INSERT INTO public.inventory (product_option_id, warehouse_id, quantity)
        VALUES (v_option_id, v_warehouse_id, v_target_qty);
      END IF;
    END IF;

    -- 조정량(delta)을 transaction_items에 기록
    INSERT INTO public.transaction_items (transaction_id, product_option_id, quantity)
    VALUES (v_transaction_id, v_option_id, v_adjustment_qty);
  END LOOP;

  RETURN jsonb_build_object('transaction_id', v_transaction_id, 'success', true);
END;
$$;

COMMENT ON FUNCTION public.create_adjustment_transaction(jsonb, jsonb[]) IS
  '재고 조정을 원자적으로 처리. p_header: warehouse_id, user_id, memo?, created_at?. p_items: [{ option_id, quantity(목표값), product_type? }]';
