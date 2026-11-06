-- Preserve historical references; serialize management writes with existing inventory writers.
ALTER TABLE public.products ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN revision integer NOT NULL DEFAULT 0;

CREATE TABLE public.management_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.management_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.management_audit FROM anon, authenticated;

CREATE OR REPLACE VIEW public.product_option_inventory_view AS
SELECT po.id AS product_option_id, po.sku, po.weight, po.unit_label, po.box_unit,
 p.id AS product_id, p.name AS product_name, b.name AS brand_name, c.name AS category_name,
 p.product_type, p.storage_type, p.origin, p.image_url, i.id AS inventory_id,
 COALESCE(i.quantity, 0) AS quantity, i.weight_in_grams, w.id AS warehouse_id, w.name AS warehouse_name
FROM public.product_options po JOIN public.products p ON po.product_id = p.id
LEFT JOIN public.brands b ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.inventory i ON i.product_option_id = po.id
LEFT JOIN public.warehouses w ON i.warehouse_id = w.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.transaction_history_view AS
SELECT t.id AS transaction_id, t.type, t.created_at, t.memo, u.name AS user_name,
 u.image_url AS user_image_url, s.name AS supplier_name, w1.name AS from_warehouse_name,
 w2.name AS to_warehouse_name, ti.product_option_id, p.name AS product_name,
 po.weight, po.unit_label, ti.quantity, p.product_type
FROM public.transactions t
JOIN public.transaction_items ti ON ti.transaction_id = t.id
JOIN public.product_options po ON po.id = ti.product_option_id
JOIN public.products p ON p.id = po.product_id
LEFT JOIN public.profiles u ON u.id = t.user_id
LEFT JOIN public.suppliers s ON s.id = t.supplier_id
LEFT JOIN public.warehouses w1 ON w1.id = t.from_warehouse_id
LEFT JOIN public.warehouses w2 ON w2.id = t.to_warehouse_id
WHERE t.cancelled_at IS NULL ORDER BY t.created_at DESC;

CREATE FUNCTION public.register_product(p_form jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.products; o public.product_options; i public.inventory;
 q numeric := COALESCE((p_form->>'quantity')::numeric, 0);
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = '42501'; END IF;
 IF NULLIF(trim(p_form->>'name'), '') IS NULL OR p_form->>'category_id' IS NULL
 OR p_form->>'brand_id' IS NULL OR p_form->>'warehouse_id' IS NULL
 OR COALESCE(p_form->>'product_type', '') NOT IN ('company','franchise','pb','material')
 OR q < 0 OR q <> trunc(q) OR q::text IN ('NaN','Infinity','-Infinity')
 THEN RAISE EXCEPTION '제품 정보와 초기 수량을 확인해주세요.' USING ERRCODE = '22023'; END IF;
 INSERT INTO public.products(name, category_id, brand_id, product_type, storage_type, origin, image_url)
 VALUES(trim(p_form->>'name'), (p_form->>'category_id')::uuid, (p_form->>'brand_id')::uuid,
 p_form->>'product_type', NULLIF(p_form->>'storage_type',''), NULLIF(p_form->>'origin',''),
 NULLIF(p_form->>'image_url','')) RETURNING * INTO p;
 INSERT INTO public.product_options(product_id,weight,unit_label,box_unit,sku)
 VALUES(p.id,(p_form->>'weight')::integer,p_form->>'unit_label',
 (p_form->>'box_unit')::integer,NULLIF(p_form->>'sku','')) RETURNING * INTO o;
 INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
 VALUES(o.id,(p_form->>'warehouse_id')::uuid,
 CASE WHEN p.product_type = 'material' THEN NULL ELSE q END,
 CASE WHEN p.product_type = 'material' THEN q::integer ELSE NULL END) RETURNING * INTO i;
 RETURN jsonb_build_object('product',to_jsonb(p),'option',to_jsonb(o),'inventory',to_jsonb(i));
END $$;

CREATE FUNCTION public.archive_product(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.products;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE = '42501'; END IF;
 LOCK TABLE public.transactions, public.products, public.product_options, public.inventory IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO p FROM public.products WHERE id = p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '제품을 찾을 수 없습니다.' USING ERRCODE = 'P0002'; END IF;
 IF p.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('success',true); END IF;
 IF EXISTS (SELECT 1 FROM public.inventory i JOIN public.product_options o ON o.id=i.product_option_id
 WHERE o.product_id=p_id AND (COALESCE(i.quantity,0) <> 0 OR COALESCE(i.weight_in_grams,0) <> 0))
 THEN RAISE EXCEPTION '재고가 남아 있는 제품은 삭제할 수 없습니다. 창고별 재고를 먼저 정리해주세요.' USING ERRCODE = '22023'; END IF;
 UPDATE public.products SET deleted_at=now(),updated_at=now() WHERE id=p_id;
 INSERT INTO public.management_audit(entity_id,action,actor_id,before_data)
 VALUES(p_id,'archive_product',auth.uid(),to_jsonb(p));
 RETURN jsonb_build_object('success',true);
END $$;

-- Use the same write lock for creation and management; derive units from the database.
CREATE OR REPLACE FUNCTION public.create_transaction(p_header jsonb, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_type text := lower(p_header->>'type'); v_warehouse uuid := (p_header->>'warehouse_id')::uuid;
 r record; v_qty numeric; v_material boolean; v_stock numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
 LOCK TABLE public.transactions, public.products, public.product_options, public.inventory IN SHARE ROW EXCLUSIVE MODE;
 IF v_type NOT IN ('in','out') OR v_type IS NULL OR v_warehouse IS NULL
 OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)=0
 THEN RAISE EXCEPTION '입출고 정보를 확인해주세요.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.transactions(type,user_id,supplier_id,memo,created_at,to_warehouse_id,from_warehouse_id)
 VALUES(v_type,auth.uid(),NULLIF(p_header->>'supplier_id','')::uuid,COALESCE(p_header->>'memo',''),
 COALESCE((p_header->>'created_at')::timestamp,now()),CASE WHEN v_type='in' THEN v_warehouse END,
 CASE WHEN v_type='out' THEN v_warehouse END) RETURNING id INTO v_id;
 FOR r IN SELECT * FROM jsonb_to_recordset(p_items) AS x(option_id uuid,quantity numeric)
 LOOP
 IF r.quantity IS NULL OR r.quantity <= 0 OR r.quantity <> trunc(r.quantity)
 OR r.quantity::text IN ('NaN','Infinity','-Infinity')
 THEN RAISE EXCEPTION '수량은 양의 정수로 입력해주세요.' USING ERRCODE='22023'; END IF;
 SELECT p.product_type='material' INTO v_material FROM public.product_options o
 JOIN public.products p ON p.id=o.product_id WHERE o.id=r.option_id AND p.deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION '사용할 수 없는 제품입니다.' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.inventory WHERE product_option_id=r.option_id AND warehouse_id=v_warehouse)>1
 THEN RAISE EXCEPTION '중복 재고 데이터가 있어 변경할 수 없습니다.' USING ERRCODE='22023'; END IF;
 v_qty := r.quantity * CASE WHEN v_type='out' THEN -1 ELSE 1 END;
 SELECT CASE WHEN v_material THEN COALESCE(weight_in_grams,0) ELSE COALESCE(quantity,0) END
 INTO v_stock FROM public.inventory WHERE product_option_id=r.option_id AND warehouse_id=v_warehouse;
 v_stock := COALESCE(v_stock,0)+v_qty;
 IF v_stock < 0 THEN RAISE EXCEPTION '재고가 부족합니다.' USING ERRCODE='22023'; END IF;
 UPDATE public.inventory SET quantity=CASE WHEN v_material THEN quantity ELSE v_stock END,
 weight_in_grams=CASE WHEN v_material THEN v_stock::integer ELSE weight_in_grams END,updated_at=now()
 WHERE product_option_id=r.option_id AND warehouse_id=v_warehouse;
 IF NOT FOUND THEN
 INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
 VALUES(r.option_id,v_warehouse,CASE WHEN v_material THEN NULL ELSE v_stock END,
 CASE WHEN v_material THEN v_stock::integer ELSE NULL END);
 END IF;
 INSERT INTO public.transaction_items(transaction_id,product_option_id,quantity) VALUES(v_id,r.option_id,r.quantity);
 END LOOP;
 RETURN jsonb_build_object('transaction_id',v_id,'success',true);
END $$;
REVOKE ALL ON FUNCTION public.create_transaction(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_transaction(jsonb,jsonb) TO authenticated;

-- Guard legacy writers too, including moves, adjustments and direct inventory inserts.
CREATE FUNCTION public.reject_archived_inventory() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id=o.product_id
 WHERE o.id=NEW.product_option_id AND p.deleted_at IS NOT NULL)
 THEN RAISE EXCEPTION '삭제된 제품의 재고는 변경할 수 없습니다.' USING ERRCODE = '22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reject_archived_inventory BEFORE INSERT OR UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.reject_archived_inventory();

CREATE OR REPLACE FUNCTION public.manage_transaction(p_id uuid,p_revision integer,p_changes jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transactions; v_before jsonb; v_after jsonb; v_items jsonb;
 v_warehouse uuid; v_supplier uuid; v_date timestamp; r record; v_stock numeric; v_material boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
 IF p_delete IS NULL THEN RAISE EXCEPTION '변경 작업을 확인해주세요.' USING ERRCODE='22023'; END IF;
 LOCK TABLE public.transactions, public.products, public.product_options, public.inventory IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO t FROM public.transactions WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '입출고 이력을 찾을 수 없습니다.' USING ERRCODE='P0002'; END IF;
 IF t.cancelled_at IS NOT NULL THEN
   IF p_delete THEN RETURN jsonb_build_object('success',true); END IF;
   RAISE EXCEPTION '이미 삭제된 이력입니다.' USING ERRCODE='22023';
 END IF;
 IF p_revision IS DISTINCT FROM t.revision THEN
 RAISE EXCEPTION '다른 작업에서 변경된 이력입니다. 새로고침 후 다시 시도해주세요.' USING ERRCODE='40001'; END IF;
 IF t.type NOT IN ('in','out') OR t.type IS NULL THEN
 RAISE EXCEPTION '입고와 출고 이력만 수정·삭제할 수 있습니다.' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('header',to_jsonb(t),'items',COALESCE(jsonb_agg(to_jsonb(ti)),'[]'::jsonb))
 INTO v_before FROM public.transaction_items ti WHERE transaction_id=p_id;

 v_warehouse := CASE WHEN p_delete THEN COALESCE(t.to_warehouse_id,t.from_warehouse_id)
 ELSE (p_changes->>'warehouse_id')::uuid END;
 v_supplier := CASE WHEN p_delete THEN t.supplier_id ELSE NULLIF(p_changes->>'supplier_id','')::uuid END;
 v_date := CASE WHEN p_delete THEN t.created_at ELSE (p_changes->>'created_at')::timestamp END;
 v_items := CASE WHEN p_delete THEN '[]'::jsonb ELSE p_changes->'items' END;
 IF v_warehouse IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=v_warehouse)
 OR v_date IS NULL THEN RAISE EXCEPTION '창고와 거래일을 확인해주세요.' USING ERRCODE='22023'; END IF;
 IF NOT p_delete THEN
 IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items)=0 THEN
 RAISE EXCEPTION '품목이 필요합니다.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric)
 LEFT JOIN public.product_options o ON o.id=x.option_id LEFT JOIN public.products p ON p.id=o.product_id
 WHERE x.option_id IS NULL OR o.id IS NULL
 OR (p.deleted_at IS NOT NULL AND (v_warehouse IS DISTINCT FROM COALESCE(t.to_warehouse_id,t.from_warehouse_id)
 OR NOT EXISTS (SELECT 1 FROM public.transaction_items old_item WHERE old_item.transaction_id=p_id
 AND old_item.product_option_id=x.option_id AND old_item.quantity=x.quantity))) OR x.quantity IS NULL
 OR x.quantity <= 0 OR x.quantity <> trunc(x.quantity) OR x.quantity::text IN ('NaN','Infinity','-Infinity'))
 OR (SELECT count(*) FROM jsonb_to_recordset(v_items) AS x(option_id uuid)) <>
 (SELECT count(DISTINCT option_id) FROM jsonb_to_recordset(v_items) AS x(option_id uuid))
 THEN RAISE EXCEPTION '제품과 수량을 확인해주세요. 같은 제품은 한 번만 선택해주세요.' USING ERRCODE='22023'; END IF;
 END IF;
 -- Net each option/warehouse delta before checking, so unchanged metadata never changes stock.
 FOR r IN
 WITH changes AS (
 SELECT ti.product_option_id AS option_id,COALESCE(t.to_warehouse_id,t.from_warehouse_id) AS warehouse_id,
 ti.quantity * CASE WHEN t.type='in' THEN -1 ELSE 1 END AS delta
 FROM public.transaction_items ti WHERE ti.transaction_id=p_id
 UNION ALL
 SELECT x.option_id,v_warehouse,x.quantity * CASE WHEN t.type='in' THEN 1 ELSE -1 END
 FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric)
 )
 SELECT option_id,warehouse_id,sum(delta) AS delta FROM changes
 GROUP BY option_id,warehouse_id HAVING sum(delta) <> 0 ORDER BY option_id,warehouse_id
 LOOP
 SELECT p.product_type='material' INTO v_material FROM public.product_options o
 JOIN public.products p ON p.id=o.product_id WHERE o.id=r.option_id;
 IF EXISTS(SELECT 1 FROM public.inventory WHERE product_option_id=r.option_id AND warehouse_id=r.warehouse_id
 GROUP BY product_option_id,warehouse_id HAVING count(*)>1)
 THEN RAISE EXCEPTION '중복 재고 데이터가 있어 변경할 수 없습니다.' USING ERRCODE='22023'; END IF;
 SELECT CASE WHEN v_material THEN COALESCE(weight_in_grams,0) ELSE COALESCE(quantity,0) END
 INTO v_stock FROM public.inventory WHERE product_option_id=r.option_id AND warehouse_id=r.warehouse_id;
 v_stock := COALESCE(v_stock,0)+r.delta;
 IF v_stock < 0 THEN RAISE EXCEPTION '변경 후 재고가 부족합니다. 이후 출고 내역과 창고별 재고를 확인해주세요.' USING ERRCODE='22023'; END IF;
 UPDATE public.inventory SET quantity=CASE WHEN v_material THEN quantity ELSE v_stock END,
 weight_in_grams=CASE WHEN v_material THEN v_stock::integer ELSE weight_in_grams END,updated_at=now()
 WHERE product_option_id=r.option_id AND warehouse_id=r.warehouse_id;
 IF NOT FOUND THEN
 INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
 VALUES(r.option_id,r.warehouse_id,CASE WHEN v_material THEN NULL ELSE v_stock END,
 CASE WHEN v_material THEN v_stock::integer ELSE NULL END);
 END IF;
 END LOOP;
 IF p_delete THEN
 UPDATE public.transactions SET cancelled_at=now(),revision=revision+1 WHERE id=p_id;
 ELSE
 UPDATE public.transactions SET memo=COALESCE(p_changes->>'memo',''),created_at=v_date,
 supplier_id=v_supplier,to_warehouse_id=CASE WHEN t.type='in' THEN v_warehouse ELSE NULL END,
 from_warehouse_id=CASE WHEN t.type='out' THEN v_warehouse ELSE NULL END,revision=revision+1 WHERE id=p_id;
 DELETE FROM public.transaction_items WHERE transaction_id=p_id;
 INSERT INTO public.transaction_items(transaction_id,product_option_id,quantity)
 SELECT p_id,x.option_id,x.quantity FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric);
 END IF;
 SELECT jsonb_build_object('header',to_jsonb(tx),'items',
 (SELECT jsonb_agg(to_jsonb(ti)) FROM public.transaction_items ti WHERE ti.transaction_id=p_id))
 INTO v_after FROM public.transactions tx WHERE tx.id=p_id;
 INSERT INTO public.management_audit(entity_id,action,actor_id,before_data,after_data)
 VALUES(p_id,CASE WHEN p_delete THEN 'cancel_transaction' ELSE 'update_transaction' END,auth.uid(),v_before,v_after);
 RETURN jsonb_build_object('success',true,'revision',t.revision+1);
END $$;

REVOKE ALL ON FUNCTION public.register_product(jsonb),public.archive_product(uuid),
 public.manage_transaction(uuid,integer,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_product(jsonb),public.archive_product(uuid),
 public.manage_transaction(uuid,integer,jsonb,boolean) TO authenticated;
