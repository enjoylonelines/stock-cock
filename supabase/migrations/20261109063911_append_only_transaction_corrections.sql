-- Immutable posted documents. A resolution appends reversal/replacement documents.
CREATE SCHEMA IF NOT EXISTS stock_internal;
REVOKE ALL ON SCHEMA stock_internal FROM PUBLIC, anon, authenticated;
ALTER TABLE public.transactions ADD COLUMN posted_at timestamptz;
ALTER TABLE public.transaction_items
 ADD COLUMN product_name_snapshot text,
 ADD COLUMN product_type_snapshot text,
 ADD COLUMN weight_snapshot integer,
 ADD COLUMN unit_label_snapshot text;

-- Freeze existing display/unit metadata at the cutover as well.
UPDATE public.transaction_items ti SET product_name_snapshot=p.name,product_type_snapshot=p.product_type,
 weight_snapshot=o.weight,unit_label_snapshot=o.unit_label
FROM public.product_options o JOIN public.products p ON p.id=o.product_id WHERE ti.product_option_id=o.id;

CREATE TABLE public.transaction_resolutions (
 source_id uuid PRIMARY KEY REFERENCES public.transactions(id),
 reversal_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id),
 replacement_id uuid UNIQUE REFERENCES public.transactions(id),
 action text NOT NULL CHECK(action IN ('correct','cancel')),
 reason text NOT NULL CHECK(length(trim(reason))>0),
 actor_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE,
 request_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.transaction_memo_notes (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 transaction_id uuid NOT NULL REFERENCES public.transactions(id),
 memo text NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason))>0),
 actor_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE,
 request_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ON public.transaction_memo_notes(transaction_id,id DESC);
CREATE UNIQUE INDEX inventory_option_warehouse_unique ON public.inventory(product_option_id,warehouse_id);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_memo_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_read_transactions ON public.transactions FOR SELECT TO authenticated USING(true);
CREATE POLICY stock_read_items ON public.transaction_items FOR SELECT TO authenticated USING(true);
CREATE POLICY stock_read_inventory ON public.inventory FOR SELECT TO authenticated USING(true);
CREATE POLICY stock_read_resolutions ON public.transaction_resolutions FOR SELECT TO authenticated USING(true);
CREATE POLICY stock_read_memos ON public.transaction_memo_notes FOR SELECT TO authenticated USING(true);
REVOKE ALL ON public.transactions,public.transaction_items,public.inventory,
 public.transaction_resolutions,public.transaction_memo_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.transactions,public.transaction_items,public.inventory,
 public.transaction_resolutions,public.transaction_memo_notes TO authenticated;

CREATE FUNCTION stock_internal.immutable_document() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION '확정된 원본은 변경할 수 없습니다. 정정 또는 취소 기록을 추가해주세요.' USING ERRCODE='22023'; END $$;
CREATE TRIGGER immutable_transactions BEFORE UPDATE OR DELETE ON public.transactions
 FOR EACH ROW EXECUTE FUNCTION stock_internal.immutable_document();
CREATE TRIGGER immutable_items BEFORE UPDATE OR DELETE ON public.transaction_items
 FOR EACH ROW EXECUTE FUNCTION stock_internal.immutable_document();
CREATE TRIGGER immutable_resolutions BEFORE UPDATE OR DELETE ON public.transaction_resolutions
 FOR EACH ROW EXECUTE FUNCTION stock_internal.immutable_document();
CREATE TRIGGER immutable_memos BEFORE UPDATE OR DELETE ON public.transaction_memo_notes
 FOR EACH ROW EXECUTE FUNCTION stock_internal.immutable_document();

CREATE FUNCTION stock_internal.freeze_stock_unit() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.product_type IS DISTINCT FROM OLD.product_type AND EXISTS(
 SELECT 1 FROM public.product_options o JOIN public.transaction_items ti ON ti.product_option_id=o.id WHERE o.product_id=OLD.id)
 OR (NEW.product_type IS DISTINCT FROM OLD.product_type AND EXISTS(SELECT 1 FROM public.inventory i JOIN public.product_options o ON o.id=i.product_option_id WHERE o.product_id=OLD.id AND (COALESCE(i.quantity,0)<>0 OR COALESCE(i.weight_in_grams,0)<>0)))
 THEN RAISE EXCEPTION '거래 이력이 있는 제품의 재고 단위 유형은 변경할 수 없습니다.' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_stock_unit BEFORE UPDATE OF product_type ON public.products
 FOR EACH ROW EXECUTE FUNCTION stock_internal.freeze_stock_unit();

CREATE FUNCTION stock_internal.freeze_option_parent() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.product_id IS DISTINCT FROM OLD.product_id AND (
 EXISTS(SELECT 1 FROM public.transaction_items WHERE product_option_id=OLD.id)
 OR EXISTS(SELECT 1 FROM public.inventory WHERE product_option_id=OLD.id AND (COALESCE(quantity,0)<>0 OR COALESCE(weight_in_grams,0)<>0)))
 THEN RAISE EXCEPTION '거래 또는 재고가 있는 옵션을 다른 제품에 연결할 수 없습니다.' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_option_parent BEFORE UPDATE OF product_id ON public.product_options
 FOR EACH ROW EXECUTE FUNCTION stock_internal.freeze_option_parent();

-- Callers hold the same write lock before reading stock or posting documents.
CREATE FUNCTION stock_internal.apply_deltas(p_deltas jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE r record; v_type text; v_current numeric; v_next numeric;
BEGIN
 FOR r IN SELECT option_id,warehouse_id,sum(delta) AS delta
 FROM jsonb_to_recordset(p_deltas) AS x(option_id uuid,warehouse_id uuid,delta numeric)
 GROUP BY option_id,warehouse_id ORDER BY option_id,warehouse_id LOOP
  IF r.delta=0 THEN CONTINUE; END IF;
  SELECT p.product_type INTO v_type FROM public.product_options o JOIN public.products p ON p.id=o.product_id
  WHERE o.id=r.option_id AND p.deleted_at IS NULL;
  IF NOT FOUND OR r.warehouse_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=r.warehouse_id)
  THEN RAISE EXCEPTION '사용할 수 없는 제품 또는 창고입니다.' USING ERRCODE='22023'; END IF;
  SELECT CASE WHEN v_type='material' THEN COALESCE(weight_in_grams,0) ELSE COALESCE(quantity,0) END INTO v_current
  FROM public.inventory WHERE product_option_id=r.option_id AND warehouse_id=r.warehouse_id;
  v_next:=COALESCE(v_current,0)+r.delta;
  IF v_next<0 THEN RAISE EXCEPTION '변경 후 재고가 부족합니다. 이후 거래와 창고별 재고를 확인해주세요.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
  VALUES(r.option_id,r.warehouse_id,CASE WHEN v_type='material' THEN NULL ELSE v_next END,
   CASE WHEN v_type='material' THEN v_next::integer ELSE NULL END)
  ON CONFLICT(product_option_id,warehouse_id) DO UPDATE
  SET quantity=EXCLUDED.quantity,weight_in_grams=EXCLUDED.weight_in_grams,updated_at=now();
 END LOOP;
END $$;

CREATE FUNCTION stock_internal.append_entry(p_header jsonb,p_items jsonb,p_copy_from uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 INSERT INTO public.transactions(type,user_id,supplier_id,from_warehouse_id,to_warehouse_id,memo,created_at,posted_at)
 VALUES(p_header->>'type',auth.uid(),NULLIF(p_header->>'supplier_id','')::uuid,
 NULLIF(p_header->>'from_warehouse_id','')::uuid,NULLIF(p_header->>'to_warehouse_id','')::uuid,
 COALESCE(p_header->>'memo',''),COALESCE((p_header->>'created_at')::timestamp,now()),clock_timestamp())
 RETURNING id INTO v_id;
 IF p_copy_from IS NOT NULL THEN
  INSERT INTO public.transaction_items(transaction_id,product_option_id,quantity,product_name_snapshot,product_type_snapshot,weight_snapshot,unit_label_snapshot)
  SELECT v_id,ti.product_option_id,ti.quantity,COALESCE(ti.product_name_snapshot,p.name),COALESCE(ti.product_type_snapshot,p.product_type),
   COALESCE(ti.weight_snapshot,o.weight),COALESCE(ti.unit_label_snapshot,o.unit_label)
  FROM public.transaction_items ti JOIN public.product_options o ON o.id=ti.product_option_id
  JOIN public.products p ON p.id=o.product_id WHERE ti.transaction_id=p_copy_from;
 ELSE
  INSERT INTO public.transaction_items(transaction_id,product_option_id,quantity,product_name_snapshot,product_type_snapshot,weight_snapshot,unit_label_snapshot)
  SELECT v_id,x.option_id,x.quantity,p.name,p.product_type,o.weight,o.unit_label
  FROM jsonb_to_recordset(p_items) AS x(option_id uuid,quantity numeric)
  JOIN public.product_options o ON o.id=x.option_id JOIN public.products p ON p.id=o.product_id;
 END IF;
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.post_inventory_transaction(p_header jsonb,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_type text:=p_header->>'type'; v_from uuid; v_to uuid; v_items jsonb; v_deltas jsonb; v_header jsonb; v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
 LOCK TABLE public.transactions,public.products,public.product_options,public.inventory IN SHARE ROW EXCLUSIVE MODE;
 IF v_type IS NULL OR v_type NOT IN ('in','out','move','adjust')
 OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)=0
 THEN RAISE EXCEPTION '거래 정보를 확인해주세요.' USING ERRCODE='22023'; END IF;
 v_from:=CASE WHEN v_type='out' THEN (p_header->>'warehouse_id')::uuid WHEN v_type='move' THEN (p_header->>'from_warehouse_id')::uuid END;
 v_to:=CASE WHEN v_type IN ('in','adjust') THEN (p_header->>'warehouse_id')::uuid WHEN v_type='move' THEN (p_header->>'to_warehouse_id')::uuid END;
 IF (v_type IN ('out','move') AND (v_from IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=v_from)))
 OR (v_type IN ('in','adjust','move') AND (v_to IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=v_to)))
 OR (v_type='move' AND v_from=v_to)
 THEN RAISE EXCEPTION '창고를 확인해주세요.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_items) AS x(option_id uuid,quantity numeric)
 LEFT JOIN public.product_options o ON o.id=x.option_id LEFT JOIN public.products p ON p.id=o.product_id
 WHERE o.id IS NULL OR p.deleted_at IS NOT NULL OR x.quantity IS NULL OR x.quantity<0
 OR (v_type<>'adjust' AND x.quantity=0) OR x.quantity<>trunc(x.quantity)
 OR x.quantity::text IN ('NaN','Infinity','-Infinity'))
 OR (SELECT count(*) FROM jsonb_to_recordset(p_items) AS x(option_id uuid))<>
 (SELECT count(DISTINCT option_id) FROM jsonb_to_recordset(p_items) AS x(option_id uuid))
 THEN RAISE EXCEPTION '제품과 정수 수량을 확인해주세요.' USING ERRCODE='22023'; END IF;
 SELECT jsonb_agg(jsonb_build_object('option_id',x.option_id,'quantity',
 CASE WHEN v_type='adjust' THEN x.quantity-COALESCE((SELECT CASE WHEN p.product_type='material' THEN i.weight_in_grams ELSE i.quantity END
 FROM public.inventory i WHERE i.product_option_id=x.option_id AND i.warehouse_id=v_to),0) ELSE x.quantity END))
 INTO v_items FROM jsonb_to_recordset(p_items) AS x(option_id uuid,quantity numeric)
 JOIN public.product_options o ON o.id=x.option_id JOIN public.products p ON p.id=o.product_id;
 SELECT jsonb_agg(d) INTO v_deltas FROM (
 SELECT x.option_id,v_from AS warehouse_id,-x.quantity AS delta FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric) WHERE v_from IS NOT NULL
 UNION ALL SELECT x.option_id,v_to,x.quantity FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric) WHERE v_to IS NOT NULL
 ) d;
 PERFORM stock_internal.apply_deltas(v_deltas);
 v_header:=p_header || jsonb_build_object('from_warehouse_id',v_from,'to_warehouse_id',v_to);
 v_id:=stock_internal.append_entry(v_header,v_items);
 RETURN jsonb_build_object('success',true,'transaction_id',v_id);
END $$;
CREATE OR REPLACE FUNCTION public.create_transaction(p_header jsonb,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF COALESCE(p_header->>'type','') NOT IN ('in','out') THEN RAISE EXCEPTION '입고 또는 출고를 선택해주세요.' USING ERRCODE='22023'; END IF;
 RETURN public.post_inventory_transaction(p_header,p_items);
END $$;

CREATE FUNCTION public.resolve_transaction(p_id uuid,p_action text,p_changes jsonb,p_reason text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.transactions; v_existing record; v_note record; v_fingerprint text; v_reverse uuid; v_replace uuid;
 v_warehouse uuid; v_items jsonb; v_deltas jsonb; v_header jsonb; v_result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR NULLIF(trim(p_reason),'') IS NULL OR p_action IS NULL OR p_action NOT IN ('correct','cancel','memo')
 THEN RAISE EXCEPTION '작업과 사유를 입력해주세요.' USING ERRCODE='22023'; END IF;
 LOCK TABLE public.transactions,public.products,public.product_options,public.inventory IN SHARE ROW EXCLUSIVE MODE;
 v_fingerprint:=md5(jsonb_build_object('id',p_id,'action',p_action,'changes',p_changes,'reason',p_reason)::text);
 SELECT * INTO v_existing FROM public.transaction_resolutions WHERE request_id=p_request_id;
 IF FOUND THEN
  IF v_existing.actor_id<>auth.uid() OR v_existing.request_fingerprint<>v_fingerprint THEN RAISE EXCEPTION '요청 번호가 다른 작업에 사용됐습니다.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('success',true,'transaction_id',COALESCE(v_existing.replacement_id,v_existing.reversal_id),'reversal_id',v_existing.reversal_id,'replacement_id',v_existing.replacement_id);
 END IF;
 SELECT * INTO v_note FROM public.transaction_memo_notes WHERE request_id=p_request_id;
 IF FOUND THEN
  IF v_note.actor_id<>auth.uid() OR v_note.request_fingerprint<>v_fingerprint THEN RAISE EXCEPTION '요청 번호가 다른 작업에 사용됐습니다.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('success',true,'transaction_id',p_id);
 END IF;
 SELECT * INTO t FROM public.transactions WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION '이력을 찾을 수 없습니다.' USING ERRCODE='P0002'; END IF;
 IF t.cancelled_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.transaction_resolutions WHERE source_id=p_id OR reversal_id=p_id)
 THEN RAISE EXCEPTION '이미 정정·취소됐거나 역거래인 기록입니다. 최신 거래를 확인해주세요.' USING ERRCODE='40001'; END IF;
 IF t.revision IS DISTINCT FROM (p_changes->>'revision')::integer THEN RAISE EXCEPTION '새로고침 후 다시 시도해주세요.' USING ERRCODE='40001'; END IF;
 IF p_action='memo' THEN
  INSERT INTO public.transaction_memo_notes(transaction_id,memo,reason,actor_id,request_id,request_fingerprint)
  VALUES(p_id,COALESCE(p_changes->>'memo',''),trim(p_reason),auth.uid(),p_request_id,v_fingerprint);
  RETURN jsonb_build_object('success',true,'transaction_id',p_id);
 END IF;
 IF t.type IS NULL OR t.type NOT IN ('in','out') THEN RAISE EXCEPTION '입고와 출고만 정정·취소할 수 있습니다.' USING ERRCODE='22023'; END IF;
 v_warehouse:=CASE WHEN p_action='cancel' THEN COALESCE(t.to_warehouse_id,t.from_warehouse_id) ELSE (p_changes->>'warehouse_id')::uuid END;
 v_items:=CASE WHEN p_action='cancel' THEN '[]'::jsonb ELSE p_changes->'items' END;
 IF p_action='correct' THEN
  IF v_warehouse IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=v_warehouse)
  OR p_changes->>'created_at' IS NULL OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items)=0
  THEN RAISE EXCEPTION '창고, 거래일과 품목을 확인해주세요.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric)
  LEFT JOIN public.product_options o ON o.id=x.option_id LEFT JOIN public.products p ON p.id=o.product_id
  WHERE o.id IS NULL OR p.deleted_at IS NOT NULL OR x.quantity IS NULL OR x.quantity<=0 OR x.quantity<>trunc(x.quantity) OR x.quantity::text IN ('NaN','Infinity','-Infinity'))
  OR (SELECT count(*) FROM jsonb_to_recordset(v_items) AS x(option_id uuid))<>(SELECT count(DISTINCT option_id) FROM jsonb_to_recordset(v_items) AS x(option_id uuid))
  THEN RAISE EXCEPTION '제품과 양의 정수 수량을 확인해주세요.' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT jsonb_agg(d) INTO v_deltas FROM (
  SELECT ti.product_option_id AS option_id,COALESCE(t.to_warehouse_id,t.from_warehouse_id) AS warehouse_id,
   ti.quantity*CASE WHEN t.type='in' THEN -1 ELSE 1 END AS delta FROM public.transaction_items ti WHERE transaction_id=p_id
  UNION ALL SELECT x.option_id,v_warehouse,x.quantity*CASE WHEN t.type='in' THEN 1 ELSE -1 END
   FROM jsonb_to_recordset(v_items) AS x(option_id uuid,quantity numeric)
 ) d;
 PERFORM stock_internal.apply_deltas(v_deltas);
 v_reverse:=stock_internal.append_entry(jsonb_build_object('type',CASE WHEN t.type='in' THEN 'out' ELSE 'in' END,
 'from_warehouse_id',t.to_warehouse_id,'to_warehouse_id',t.from_warehouse_id,'supplier_id',t.supplier_id,
 'memo',trim(p_reason),'created_at',now()),'[]',p_id);
 IF p_action='correct' THEN
  v_header:=jsonb_build_object('type',t.type,'supplier_id',NULLIF(p_changes->>'supplier_id','')::uuid,
  'from_warehouse_id',CASE WHEN t.type='out' THEN v_warehouse END,'to_warehouse_id',CASE WHEN t.type='in' THEN v_warehouse END,
  'memo',COALESCE(p_changes->>'memo',''),'created_at',p_changes->>'created_at');
  v_replace:=stock_internal.append_entry(v_header,v_items);
 END IF;
 INSERT INTO public.transaction_resolutions(source_id,reversal_id,replacement_id,action,reason,actor_id,request_id,request_fingerprint)
 VALUES(p_id,v_reverse,v_replace,p_action,trim(p_reason),auth.uid(),p_request_id,v_fingerprint);
 RETURN jsonb_build_object('success',true,'transaction_id',COALESCE(v_replace,v_reverse),'reversal_id',v_reverse,'replacement_id',v_replace);
END $$;

CREATE OR REPLACE FUNCTION public.manage_transaction(p_id uuid,p_revision integer,p_changes jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION '원본 수정·삭제는 중단됐습니다. 정정·취소 기능을 사용해주세요.' USING ERRCODE='0A000'; END $$;
REVOKE ALL ON FUNCTION public.manage_transaction(uuid,integer,jsonb,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE VIEW public.transaction_history_view WITH(security_invoker=true) AS
SELECT t.id AS transaction_id,t.type,t.created_at,t.memo,u.name AS user_name,u.image_url AS user_image_url,
 s.name AS supplier_name,w1.name AS from_warehouse_name,w2.name AS to_warehouse_name,
 ti.product_option_id,COALESCE(ti.product_name_snapshot,p.name) AS product_name,
 COALESCE(ti.weight_snapshot,po.weight) AS weight,COALESCE(ti.unit_label_snapshot,po.unit_label) AS unit_label,
 ti.quantity,COALESCE(ti.product_type_snapshot,p.product_type) AS product_type,
 COALESCE(t.posted_at,t.created_at AT TIME ZONE 'UTC') AS recorded_at,
 CASE WHEN t.cancelled_at IS NOT NULL THEN 'legacy_cancelled' WHEN r.source_id IS NOT NULL THEN
 CASE WHEN r.action='correct' THEN 'corrected' ELSE 'cancelled' END ELSE 'posted' END AS transaction_status,
 CASE WHEN rev.reversal_id IS NOT NULL THEN 'reversal' WHEN parent.replacement_id IS NOT NULL THEN 'replacement' ELSE 'original' END AS entry_kind,
 COALESCE(parent.source_id,rev.source_id) AS source_transaction_id,
 COALESCE(r.replacement_id,r.reversal_id) AS resolved_by_transaction_id,
 COALESCE(r.reason,rev.reason,parent.reason) AS resolution_reason,
 note.memo AS latest_memo,note.reason AS memo_reason
FROM public.transactions t JOIN public.transaction_items ti ON ti.transaction_id=t.id
JOIN public.product_options po ON po.id=ti.product_option_id JOIN public.products p ON p.id=po.product_id
LEFT JOIN public.profiles u ON u.id=t.user_id LEFT JOIN public.suppliers s ON s.id=t.supplier_id
LEFT JOIN public.warehouses w1 ON w1.id=t.from_warehouse_id LEFT JOIN public.warehouses w2 ON w2.id=t.to_warehouse_id
LEFT JOIN public.transaction_resolutions r ON r.source_id=t.id
LEFT JOIN public.transaction_resolutions rev ON rev.reversal_id=t.id
LEFT JOIN public.transaction_resolutions parent ON parent.replacement_id=t.id
LEFT JOIN LATERAL(SELECT n.memo,n.reason FROM public.transaction_memo_notes n WHERE n.transaction_id=t.id ORDER BY n.id DESC LIMIT 1) note ON true;
CREATE VIEW public.effective_transactions WITH(security_invoker=true) AS
SELECT t.* FROM public.transactions t WHERE t.cancelled_at IS NULL
AND NOT EXISTS(SELECT 1 FROM public.transaction_resolutions r WHERE r.source_id=t.id OR r.reversal_id=t.id);
GRANT SELECT ON public.effective_transactions TO authenticated;
ALTER VIEW public.product_option_inventory_view SET(security_invoker=true);

-- Subscribe to appended resolution and memo records when Realtime is configured.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='transaction_resolutions') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_resolutions;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='transaction_memo_notes') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_memo_notes;
  END IF;
 END IF;
END $$;
-- Retaining posted records is part of append-only semantics.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='prune-old-transactions';
 END IF;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA stock_internal FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.post_inventory_transaction(jsonb,jsonb),public.resolve_transaction(uuid,text,jsonb,text,uuid),
 public.create_transaction(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.post_inventory_transaction(jsonb,jsonb),public.resolve_transaction(uuid,text,jsonb,text,uuid),
 public.create_transaction(jsonb,jsonb) TO authenticated;

-- Opening balances follow the same posting protocol.
CREATE OR REPLACE FUNCTION public.register_product(p_form jsonb) RETURNS jsonb
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
 LOCK TABLE public.transactions,public.products,public.product_options,public.inventory IN SHARE ROW EXCLUSIVE MODE;
 INSERT INTO public.products(name, category_id, brand_id, product_type, storage_type, origin, image_url)
 VALUES(trim(p_form->>'name'), (p_form->>'category_id')::uuid, (p_form->>'brand_id')::uuid,
 p_form->>'product_type', NULLIF(p_form->>'storage_type',''), NULLIF(p_form->>'origin',''),
 NULLIF(p_form->>'image_url','')) RETURNING * INTO p;
 INSERT INTO public.product_options(product_id,weight,unit_label,box_unit,sku)
 VALUES(p.id,(p_form->>'weight')::integer,p_form->>'unit_label',
 (p_form->>'box_unit')::integer,NULLIF(p_form->>'sku','')) RETURNING * INTO o;
 INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
 VALUES(o.id,(p_form->>'warehouse_id')::uuid,
 CASE WHEN p.product_type = 'material' THEN NULL ELSE 0 END,
 CASE WHEN p.product_type = 'material' THEN 0 ELSE NULL END) RETURNING * INTO i;
 PERFORM public.post_inventory_transaction(jsonb_build_object('type','adjust','warehouse_id',(p_form->>'warehouse_id')::uuid,'memo','제품 등록 초기 재고'),
 jsonb_build_array(jsonb_build_object('option_id',o.id,'quantity',q)));
 SELECT * INTO i FROM public.inventory WHERE product_option_id=o.id AND warehouse_id=(p_form->>'warehouse_id')::uuid;
 RETURN jsonb_build_object('product',to_jsonb(p),'option',to_jsonb(o),'inventory',to_jsonb(i));
END $$;

