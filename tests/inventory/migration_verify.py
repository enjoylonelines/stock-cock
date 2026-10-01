#!/usr/bin/env python3
"""Upgrade, old-function restoration, and clean replay on this disposable DB only."""
import argparse, json
import run as r
import reference_harness as h
def body(c):
    return c.execute("SELECT pg_get_functiondef('public.create_transaction(jsonb,jsonb)'::regprocedure)").fetchone()[0]
def inventory(c,f):
    return c.execute('SELECT id,quantity,weight_in_grams FROM inventory WHERE warehouse_id=%s ORDER BY id',(f['warehouse'],)).fetchall()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);args=ap.parse_args()
    result={}
    try:
      with h.connection('migration-verification') as c:
        r.guard(c)
        f=h.fixture(c,100,False); before=inventory(c,f)
        r.install(c,r.BASELINE);result['restored_baseline_hash']=r.digest(r.BASELINE)
        original=body(c)
        r.install(c,r.SELECTED);result['upgrade_hash']=r.digest(r.SELECTED); result['phase']='selected-upgrade'
        result['phase']='check-upgrade-data'; assert inventory(c,f)==before
        selected=body(c)
        r.install(c,r.BASELINE); result['phase']='check-baseline-restore'; assert body(c)==original
        result['phase']='check-baseline-data'
        r.install(c,r.SELECTED); result['phase']='check-selected-reapply'
        r.install(c,r.POLICY); result['policy_hash']=r.digest(r.POLICY)
        result['phase']='policy-installed'
        result['upgrade_restore_reapply_preserves_data']=True
        result['environment_before_clean']=r.meta(c)
        result['phase']='before-clean'
        # No network-configurable target and an exact private test marker guard above.
        # This intentionally destroys only the disposable test schema after raw results are saved.
        c.execute('DROP EXTENSION pg_cron CASCADE')
        c.execute('DROP SCHEMA public CASCADE; DROP SCHEMA auth CASCADE; DROP SCHEMA storage CASCADE; CREATE SCHEMA public')
        result['clean_migrations']=r.setup(c,include_selected=True)
        result['phase']='clean-replayed'
        assert c.execute("SELECT 1 FROM pg_indexes WHERE indexname='inventory_product_option_warehouse_unique'").fetchone()==(1,)
        assert c.execute("SELECT 1 FROM pg_proc WHERE oid='public.create_transaction(jsonb,jsonb)'::regprocedure").fetchone()==(1,)
        result['clean_and_upgrade_function_identical']=True
        result['catalog']={
          'constraints':c.execute("SELECT conrelid::regclass::text,conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conname").fetchall(),
          'indexes':c.execute("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname").fetchall(),
          'rls':c.execute("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname").fetchall(),
          'policies':c.execute("SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname").fetchall(),
          'extensions':c.execute('SELECT extname,extversion FROM pg_extension ORDER BY extname').fetchall(),
          'jobs':c.execute('SELECT jobname,schedule,active FROM cron.job ORDER BY jobname').fetchall(),
          'function_acl':c.execute("SELECT proacl::text,prosecdef,proconfig,pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.create_transaction(jsonb,jsonb)'::regprocedure").fetchall()}
        result['smoke']=r.execute(c,'policy',r.POLICY,[('count','C0','natural'),('count','C2','row-lock-gate'),('g','C2','row-lock-gate')],1,install_variant=False)
        result['phase']='smoke'
        assert not result['smoke'].get('stopped')
        assert not any(t['coverage_failures'] for t in result['smoke']['trials'])
        c.execute("NOTIFY pgrst, 'reload schema'")
    except Exception as e: result['blocked']=f'{type(e).__name__}: {e}'
    h.write_result(args.output,result)
    print(json.dumps({'output':args.output,'blocked':result.get('blocked'),'clean_migrations':len(result.get('clean_migrations',[]))}))
    return 2 if result.get('blocked') else 0
if __name__=='__main__':raise SystemExit(main())
