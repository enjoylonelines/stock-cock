BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 actor uuid := gen_random_uuid(); b uuid; c uuid; w uuid; w2 uuid;
 p jsonb; mat jsonb; historical jsonb; op uuid; mop uuid; hop uuid;
 tx uuid; out_tx uuid; used_tx uuid; mtx uuid; htx uuid; q numeric;
 base jsonb; changes jsonb; result jsonb; checks integer := 0;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 INSERT INTO public.brands(name) VALUES('__migration_rollback_test__') RETURNING id INTO b;
 INSERT INTO public.categories(name) VALUES('__migration_rollback_test__') RETURNING id INTO c;
 INSERT INTO public.warehouses(name) VALUES('__migration_rollback_test_A__') RETURNING id INTO w;
 INSERT INTO public.warehouses(name) VALUES('__migration_rollback_test_B__') RETURNING id INTO w2;
 base := jsonb_build_object('name','__migration_rollback_test__','brand_id',b,'category_id',c,
 'warehouse_id',w,'product_type','company','quantity',0,'weight',1000,'unit_label','g',
 'sku','verify-'||gen_random_uuid()::text);
 p := public.register_product(base);
 op := (p->'option'->>'id')::uuid;
 IF (p->'inventory'->>'quantity')::numeric <> 0 THEN RAISE EXCEPTION 'product registration failed'; END IF;
 checks := checks+1;
 BEGIN
  PERFORM public.register_product(base || jsonb_build_object('name','__migration_partial_failure__'));
  RAISE EXCEPTION 'duplicate SKU was accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.products WHERE name='__migration_partial_failure__') THEN RAISE EXCEPTION 'partial product retained'; END IF;
 checks := checks+1;
 mat := public.register_product(base || jsonb_build_object('name','__migration_material__','product_type','material','quantity',2500,'sku','verify-'||gen_random_uuid()::text));
 mop := (mat->'option'->>'id')::uuid;
 IF (mat->'inventory'->>'weight_in_grams')::integer <> 2500 OR mat->'inventory'->>'quantity' IS NOT NULL THEN RAISE EXCEPTION 'material registration units failed'; END IF;
 checks := checks+1;
 tx := (public.create_transaction(jsonb_build_object('type','in','warehouse_id',w,'memo','rollback test'),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',10)))->>'transaction_id')::uuid;
 out_tx := (public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',4)))->>'transaction_id')::uuid;
 SELECT quantity INTO q FROM public.inventory WHERE product_option_id=op AND warehouse_id=w;
 IF q<>6 OR (SELECT user_id FROM public.transactions WHERE id=tx)<>actor THEN RAISE EXCEPTION 'create or actor failed'; END IF;
 checks := checks+1;
 changes := jsonb_build_object('warehouse_id',w,'created_at',now(),'memo','수정 검증','items',jsonb_build_array(jsonb_build_object('option_id',op,'quantity',8)));
 PERFORM public.manage_transaction(tx,0,changes,false);
 SELECT quantity INTO q FROM public.inventory WHERE product_option_id=op AND warehouse_id=w;
 IF q<>4 THEN RAISE EXCEPTION 'edit stock delta failed'; END IF;
 BEGIN
  PERFORM public.manage_transaction(tx,0,changes,false);
  RAISE EXCEPTION 'stale revision accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 checks := checks+1;
 PERFORM public.manage_transaction(out_tx,0,'{}',true);
 PERFORM public.manage_transaction(out_tx,0,'{}',true);
 SELECT quantity INTO q FROM public.inventory WHERE product_option_id=op AND warehouse_id=w;
 IF q<>8 OR EXISTS(SELECT 1 FROM public.transaction_history_view WHERE transaction_id=out_tx) THEN RAISE EXCEPTION 'idempotent cancellation failed'; END IF;
 checks := checks+1;
 used_tx := (public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',7)))->>'transaction_id')::uuid;
 BEGIN
  PERFORM public.manage_transaction(tx,1,'{}',true);
  RAISE EXCEPTION 'insufficient cancellation accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 SELECT quantity INTO q FROM public.inventory WHERE product_option_id=op AND warehouse_id=w;
 IF q<>1 OR (SELECT revision FROM public.transactions WHERE id=tx)<>1 THEN RAISE EXCEPTION 'failure changed data'; END IF;
 PERFORM public.manage_transaction(used_tx,0,'{}',true);
 checks := checks+1;
 PERFORM public.manage_transaction(tx,1,changes || jsonb_build_object('warehouse_id',w2),false);
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w)<>0
 OR (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w2)<>8 THEN RAISE EXCEPTION 'warehouse transfer failed'; END IF;
 checks := checks+1;
 used_tx := (public.create_transaction(jsonb_build_object('type','out','warehouse_id',w2),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',1)))->>'transaction_id')::uuid;
 BEGIN
  PERFORM public.manage_transaction(used_tx,0,changes || jsonb_build_object('warehouse_id',w2,'items',jsonb_build_array(jsonb_build_object('option_id',op,'quantity',2),jsonb_build_object('option_id',mop,'quantity',999999))),false);
  RAISE EXCEPTION 'multi-item shortage accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT quantity FROM public.inventory WHERE product_option_id=op AND warehouse_id=w2)<>7 OR (SELECT revision FROM public.transactions WHERE id=used_tx)<>0 THEN RAISE EXCEPTION 'partial multi-item write retained'; END IF;
 PERFORM public.manage_transaction(used_tx,0,'{}',true);
 checks := checks+1;
 mtx := (public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',mop,'quantity',500,'product_type','company')))->>'transaction_id')::uuid;
 PERFORM public.manage_transaction(mtx,0,changes || jsonb_build_object('items',jsonb_build_array(jsonb_build_object('option_id',mop,'quantity',250))),false);
 IF (SELECT weight_in_grams FROM public.inventory WHERE product_option_id=mop AND warehouse_id=w)<>2250 THEN RAISE EXCEPTION 'material edit units failed'; END IF;
 PERFORM public.manage_transaction(mtx,1,'{}',true);
 IF (SELECT weight_in_grams FROM public.inventory WHERE product_option_id=mop AND warehouse_id=w)<>2500 THEN RAISE EXCEPTION 'material cancellation failed'; END IF;
 checks := checks+1;
 BEGIN
  PERFORM public.archive_product((p->'product'->>'id')::uuid);
  RAISE EXCEPTION 'nonzero archive accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.manage_transaction(tx,2,'{}',true);
 PERFORM public.archive_product((p->'product'->>'id')::uuid);
 IF EXISTS(SELECT 1 FROM public.product_option_inventory_view WHERE product_id=(p->'product'->>'id')::uuid) THEN RAISE EXCEPTION 'archived product visible'; END IF;
 BEGIN
  PERFORM public.create_transaction(jsonb_build_object('type','in','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',op,'quantity',1)));
  RAISE EXCEPTION 'archived product reused';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 checks := checks+1;
 historical := public.register_product(base || jsonb_build_object('name','__migration_history__','product_type','material','sku','verify-'||gen_random_uuid()::text));
 hop := (historical->'option'->>'id')::uuid;
 htx := (public.create_transaction(jsonb_build_object('type','in','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',hop,'quantity',200)))->>'transaction_id')::uuid;
 PERFORM public.create_transaction(jsonb_build_object('type','out','warehouse_id',w),jsonb_build_array(jsonb_build_object('option_id',hop,'quantity',200)));
 PERFORM public.archive_product((historical->'product'->>'id')::uuid);
 PERFORM public.manage_transaction(htx,0,changes || jsonb_build_object('items',jsonb_build_array(jsonb_build_object('option_id',hop,'quantity',200))),false);
 IF (SELECT count(*) FROM public.transaction_history_view WHERE product_option_id=hop)<>2
 OR (SELECT product_type FROM public.transaction_history_view WHERE transaction_id=htx LIMIT 1)<>'material' THEN RAISE EXCEPTION 'archived history lost'; END IF;
 checks := checks+1;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN
  PERFORM public.archive_product((mat->'product'->>'id')::uuid);
  RAISE EXCEPTION 'unauthenticated write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 IF has_function_privilege('anon','public.manage_transaction(uuid,integer,jsonb,boolean)','EXECUTE')
 OR has_table_privilege('authenticated','public.management_audit','SELECT') THEN RAISE EXCEPTION 'unexpected grants'; END IF;
 checks := checks+1;
 PERFORM set_config('app.management_test_results',jsonb_build_object('passed_groups',checks,'result','all assertions passed','role',current_user,'test_data','ROLLBACK at end')::text,true);
END $test$;
RESET ROLE;
SELECT current_setting('app.management_test_results')::jsonb AS tests,
 (SELECT count(*) FROM public.management_audit WHERE actor_id=auth.uid()) AS temporary_audit_rows;
ROLLBACK;
