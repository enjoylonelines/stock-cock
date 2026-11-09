BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='25s';
SET LOCAL ROLE authenticated;
DO $test$
DECLARE actor uuid:=gen_random_uuid(); b uuid; c uuid; w uuid; w2 uuid;
 p jsonb; m jsonb; op uuid; mop uuid; tx uuid; otx uuid; current_id uuid; out_id uuid;
 req uuid; res jsonb; changes jsonb; before_source jsonb; after_source jsonb; q numeric;
 n bigint; before_stock jsonb; ledger numeric; actual numeric; checks integer:=0;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 INSERT INTO public.brands(name) VALUES('__append_test__') RETURNING id INTO b;
 INSERT INTO public.categories(name) VALUES('__append_test__') RETURNING id INTO c;
 INSERT INTO public.warehouses(name) VALUES('__append_A__') RETURNING id INTO w;
 INSERT INTO public.warehouses(name) VALUES('__append_B__') RETURNING id INTO w2;
 p:=public.register_product(jsonb_build_object('name','__append_product__','brand_id',b,'category_id',c,'warehouse_id',w,'product_type','company','quantity',0,'weight',1000,'unit_label','g','sku',gen_random_uuid()::text));
 m:=public.register_product(jsonb_build_object('name','__append_material__','brand_id',b,'category_id',c,'warehouse_id',w,'product_type','material','quantity',2500,'weight',1000,'unit_label','g','sku',gen_random_uuid()::text));
 op:=(p->'option'->>'id')::uuid; mop:=(m->'option'->>'id')::uuid;
 IF (m->'inventory'->>'weight_in_grams')::integer<>2500 THEN RAISE EXCEPTION 'opening balance failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.transaction_items ti JOIN public.transactions t ON t.id=ti.transaction_id WHERE ti.product_option_id=mop AND t.type='adjust' AND ti.quantity=2500) THEN RAISE EXCEPTION 'opening ledger missing'; END IF;
 checks:=checks+1;
 tx:=(public.create_transaction(jsonb_build_object('type','in','warehouse_id',w,'memo','original memo'),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',10)))->>'transaction_id')::uuid;
 otx:=(public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',4)))->>'transaction_id')::uuid;
 SELECT jsonb_build_object('header',to_jsonb(t),'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.transaction_items i WHERE transaction_id=tx)) INTO before_source FROM public.transactions t WHERE id=tx;
 changes:=jsonb_build_object('revision',0,'warehouse_id',w,'created_at',now(),'memo','replacement memo','items',jsonb_build_array(jsonb_build_object('option_id',op,'quantity',8)));
 req:=gen_random_uuid();
 res:=public.resolve_transaction(tx,'correct',changes,'잘못 입력한 수량 정정',req);
 current_id:=(res->>'replacement_id')::uuid;
 SELECT jsonb_build_object('header',to_jsonb(t),'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.transaction_items i WHERE transaction_id=tx)) INTO after_source FROM public.transactions t WHERE id=tx;
 IF before_source IS DISTINCT FROM after_source THEN RAISE EXCEPTION 'original was changed'; END IF;
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>4 THEN RAISE EXCEPTION 'net correction failed'; END IF;
 IF (SELECT type FROM public.transactions WHERE id=(res->>'reversal_id')::uuid)<>'out' THEN RAISE EXCEPTION 'reversal missing'; END IF;
 checks:=checks+1;
 SELECT count(*) INTO n FROM public.transactions;
 IF (public.resolve_transaction(tx,'correct',changes,'잘못 입력한 수량 정정',req)->>'replacement_id')::uuid<>current_id OR (SELECT count(*) FROM public.transactions)<>n THEN RAISE EXCEPTION 'retry duplicated posting'; END IF;
 BEGIN PERFORM public.resolve_transaction(tx,'cancel',jsonb_build_object('revision',0),'중복 처리',gen_random_uuid()); RAISE EXCEPTION 'resolved source reused'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.resolve_transaction(tx,'correct',changes,'different payload',req); RAISE EXCEPTION 'request key reused'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 checks:=checks+1;
 req:=gen_random_uuid();
 SELECT count(*) INTO n FROM public.transactions;
 PERFORM public.resolve_transaction(current_id,'memo',jsonb_build_object('revision',0,'memo','메모만 정정'),'메모 오타',req);
 PERFORM public.resolve_transaction(current_id,'memo',jsonb_build_object('revision',0,'memo','메모만 정정'),'메모 오타',req);
 IF (SELECT memo FROM public.transactions WHERE id=current_id)<>'replacement memo' OR (SELECT count(*) FROM public.transactions)<>n
 OR (SELECT count(*) FROM public.transaction_memo_notes WHERE transaction_id=current_id)<>1
 OR (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>4 THEN RAISE EXCEPTION 'memo changed original or stock'; END IF;
 checks:=checks+1;
 req:=gen_random_uuid();
 PERFORM public.resolve_transaction(otx,'cancel',jsonb_build_object('revision',0),'출고 취소',req);
 PERFORM public.resolve_transaction(otx,'cancel',jsonb_build_object('revision',0),'출고 취소',req);
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>8 THEN RAISE EXCEPTION 'cancel retry failed'; END IF;
 checks:=checks+1;
 out_id:=(public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',7)))->>'transaction_id')::uuid;
 SELECT count(*) INTO n FROM public.transactions;
 BEGIN PERFORM public.resolve_transaction(current_id,'cancel',jsonb_build_object('revision',0),'입고 취소',gen_random_uuid()); RAISE EXCEPTION 'shortage accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT count(*) FROM public.transactions)<>n OR EXISTS(SELECT 1 FROM public.transaction_resolutions WHERE source_id=current_id)
 OR (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>1 THEN RAISE EXCEPTION 'failure retained partial data'; END IF;
 PERFORM public.resolve_transaction(out_id,'cancel',jsonb_build_object('revision',0),'테스트 출고 취소',gen_random_uuid());
 checks:=checks+1;
 res:=public.resolve_transaction(current_id,'correct',changes||jsonb_build_object('warehouse_id',w2),'창고 정정',gen_random_uuid());
 current_id:=(res->>'replacement_id')::uuid;
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>0
 OR (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w2)<>8 THEN RAISE EXCEPTION 'warehouse correction failed'; END IF;
 checks:=checks+1;
 PERFORM public.post_inventory_transaction(jsonb_build_object('type','move','from_warehouse_id',w2,'to_warehouse_id',w),
 jsonb_build_array(jsonb_build_object('option_id',op,'quantity',3)));
 PERFORM public.post_inventory_transaction(jsonb_build_object('type','adjust','warehouse_id',w),
 jsonb_build_array(jsonb_build_object('option_id',op,'quantity',2)));
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>2
 OR (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w2)<>5 THEN RAISE EXCEPTION 'atomic move/adjust failed'; END IF;
 checks:=checks+1;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY id) INTO before_stock FROM public.inventory i WHERE product_option_id IN (op,mop);
 SELECT count(*) INTO n FROM public.transactions;
 BEGIN
  PERFORM public.post_inventory_transaction(jsonb_build_object('type','move','from_warehouse_id',w2,'to_warehouse_id',w),
  jsonb_build_array(jsonb_build_object('option_id',op,'quantity',1),jsonb_build_object('option_id',mop,'quantity',999999)));
  RAISE EXCEPTION 'multi-item shortage accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF before_stock IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.inventory i WHERE product_option_id IN (op,mop))
 OR (SELECT count(*) FROM public.transactions)<>n THEN RAISE EXCEPTION 'partial move retained'; END IF;
 BEGIN PERFORM public.resolve_transaction(current_id,'cancel',jsonb_build_object('revision',0),'이동 후 취소',gen_random_uuid()); RAISE EXCEPTION 'post-move shortage accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 checks:=checks+1;
 out_id:=(public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',mop,'quantity',500,'product_type','company')))->>'transaction_id')::uuid;
 res:=public.resolve_transaction(out_id,'correct',changes||jsonb_build_object('items',jsonb_build_array(jsonb_build_object('option_id',mop,'quantity',250))),'원재료 중량 정정',gen_random_uuid());
 IF (SELECT weight_in_grams FROM public.inventory WHERE product_option_id=mop AND warehouse_id=w)<>2250 THEN RAISE EXCEPTION 'material correction failed'; END IF;
 PERFORM public.resolve_transaction((res->>'replacement_id')::uuid,'cancel',jsonb_build_object('revision',0),'원재료 출고 취소',gen_random_uuid());
 IF (SELECT weight_in_grams FROM public.inventory WHERE product_option_id=mop AND warehouse_id=w)<>2500 THEN RAISE EXCEPTION 'material cancellation failed'; END IF;
 checks:=checks+1;
 BEGIN UPDATE public.transactions SET memo='forged' WHERE id=tx; RAISE EXCEPTION 'raw document update permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.transaction_items WHERE transaction_id=tx; RAISE EXCEPTION 'raw item delete permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.inventory SET quantity=999 WHERE product_option_id=op; RAISE EXCEPTION 'raw inventory update permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.manage_transaction(tx,0,'{}',true); RAISE EXCEPTION 'old management RPC permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 checks:=checks+1;
 BEGIN UPDATE public.products SET product_type='material' WHERE id=(p->'product'->>'id')::uuid; RAISE EXCEPTION 'stock unit changed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN UPDATE public.product_options SET product_id=(m->'product'->>'id')::uuid WHERE id=op; RAISE EXCEPTION 'stock option reparented'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 UPDATE public.products SET name='renamed after posting' WHERE id=(p->'product'->>'id')::uuid;
 IF (SELECT product_name FROM public.transaction_history_view WHERE transaction_id=tx LIMIT 1)<>'__append_product__' THEN RAISE EXCEPTION 'snapshot changed with catalog'; END IF;
 IF (SELECT transaction_status FROM public.transaction_history_view WHERE transaction_id=tx LIMIT 1)<>'corrected'
 OR NOT EXISTS(SELECT 1 FROM public.transaction_history_view WHERE transaction_id=tx)
 OR EXISTS(SELECT 1 FROM public.effective_transactions WHERE id=tx) THEN RAISE EXCEPTION 'history/effective projection failed'; END IF;
 checks:=checks+1;
 -- Reversal and replacement documents must reconcile per option AND warehouse.
 IF EXISTS(
 WITH effects AS (
 SELECT ti.product_option_id AS opid,t.from_warehouse_id AS wid,-ti.quantity AS delta FROM public.transactions t
 JOIN public.transaction_items ti ON ti.transaction_id=t.id WHERE ti.product_option_id IN (op,mop) AND t.from_warehouse_id IS NOT NULL
 UNION ALL
 SELECT ti.product_option_id,t.to_warehouse_id,ti.quantity FROM public.transactions t
 JOIN public.transaction_items ti ON ti.transaction_id=t.id WHERE ti.product_option_id IN (op,mop) AND t.to_warehouse_id IS NOT NULL
 ), totals AS (SELECT opid,wid,sum(delta) AS balance FROM effects GROUP BY opid,wid)
 SELECT 1 FROM totals l FULL JOIN (SELECT * FROM public.inventory WHERE product_option_id IN(op,mop)) i
 ON l.opid=i.product_option_id AND l.wid=i.warehouse_id
 WHERE COALESCE(l.balance,0)<>COALESCE(i.quantity,i.weight_in_grams,0))
 THEN RAISE EXCEPTION 'ledger differs from inventory'; END IF;
 checks:=checks+1;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.resolve_transaction(current_id,'memo',jsonb_build_object('revision',0,'memo','bad'),'test',gen_random_uuid()); RAISE EXCEPTION 'missing auth accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM set_config('app.append_test_result',jsonb_build_object('groups',checks+1,'result','all assertions passed','original_preserved',true,'ledger_reconciled',true)::text,true);
END $test$;
RESET ROLE;
-- Even privileged maintenance cannot silently update/delete a posted document.
DO $$ BEGIN
 BEGIN UPDATE public.transactions SET memo=memo WHERE id=(SELECT id FROM public.transactions LIMIT 1);
 RAISE EXCEPTION 'immutable trigger missing'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT current_setting('app.append_test_result')::jsonb AS result;
ROLLBACK;
