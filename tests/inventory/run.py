#!/usr/bin/env python3
"""Bounded test-only RPC comparison; fixed loopback DB, no production URL."""
import argparse, json, hashlib, subprocess, uuid
from pathlib import Path
import reference_harness as h
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
MIG=ROOT/'supabase/migrations'
BASELINE=MIG/'20260131110000_fix_create_transaction_rpc_signature.sql'
SELECTED=MIG/'20260923000000_guard_inventory_transactions.sql'
POLICY=MIG/'20260924000000_enforce_inventory_pair_policy.sql'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def meta(c):
    return dict(version=c.execute('SELECT version()').fetchone()[0],
        isolation=c.execute('SHOW transaction_isolation').fetchone()[0],
        cron_active=c.execute('SHOW cron.launch_active_jobs').fetchone()[0],
        git_head=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip(),
        dirty=subprocess.check_output(['git','-C',str(ROOT),'status','--porcelain'],text=True),
        harness_hash=digest(BASE/'reference_harness.py'),runner_hash=digest(Path(__file__)),
        mode='all-repository-migrations; auth/storage stubs; direct SQL',
        seed='UUID fixtures random; amounts/schedule/units fixed; no performance comparison')
def guard(c):
    assert c.execute('SELECT current_database(),current_user').fetchone()==('inventory_p0_test','inventory_p0_test')
    assert c.execute('SELECT name FROM public.inventory_reinforcement_environment').fetchone()==('stock-cock-consistency-test',)
    assert c.execute('SHOW cron.launch_active_jobs').fetchone()[0]=='off'
def setup(c, include_selected=False):
    assert c.execute("SELECT count(*) FROM pg_tables WHERE schemaname='public'").fetchone()[0]==0, 'Refuse nonempty DB'
    c.execute((BASE/'bootstrap.sql').read_text())
    applied=[]
    for p in sorted(MIG.glob('*.sql')):
        if p in (SELECTED, POLICY) and not include_selected: continue
        with c.transaction(): c.execute(p.read_text())
        applied.append(dict(file=p.name,sha256=digest(p)))
    c.execute("CREATE TABLE inventory_reinforcement_environment(name text PRIMARY KEY)")
    c.execute("INSERT INTO inventory_reinforcement_environment VALUES ('stock-cock-consistency-test')")
    return applied
def install(c,p):
    c.execute(p.read_text())
    row=c.execute("SELECT prosrc,prosecdef,proconfig FROM pg_proc WHERE oid='public.create_transaction(jsonb,jsonb)'::regprocedure").fetchone()
    # Policy migrations may contain a diagnostic DO $$ block before the function.
    # Verify the security contract here; source/hash is recorded separately.
    assert row[1] and row[2]==['search_path=public']
def gate_proof(t):
    ob=t['observation']; gate=ob.get('gate',{})
    valid=[]
    for s in ob.get('samples',[]):
        if not gate.get('released_ns') or s['sample_ns']>=gate['released_ns']: continue
        a={r[0]:r for r in s['activity']}
        def reaches(pid,seen=frozenset()):
            if pid==gate['pid']: return True
            if pid in seen or pid not in a:return False
            return any(reaches(p,seen|{pid}) for p in a[pid][4])
        if all(p in a and a[p][1]=='active' and a[p][2]=='Lock' and reaches(p) for p in ob['worker_pids']):
            valid.append(s['sample_ns'])
    return valid
def execute(c,variant,p,cases,repeats,install_variant=True):
    if install_variant: install(c,p)
    result={'variant':variant,'sql_hash':digest(p),'environment':meta(c),'trials':[]}
    for unit,case,mode in cases:
        for repeat in range(repeats):
            t=h.trial(c,case,unit=='g',mode); t['repeat']=repeat+1
            if mode=='row-lock-gate' and case not in ('C0','C4'):
                t['pre_release_gate_proof']=gate_proof(t)
                if not t['pre_release_gate_proof']:t['coverage_failures'].append('gate_chain_not_proven')
            result['trials'].append(t)
            if variant!='baseline' and t['failures']:
                result['stopped']='correctness_failure'; return result
    return result
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('action',choices=['setup','compare','retest'])
    ap.add_argument('--output',required=True); args=ap.parse_args()
    result={}
    try:
        with h.connection('reinforcement-admin') as c:
            if args.action=='setup': result={'migrations':setup(c),'environment':meta(c)}
            else:
                guard(c)
                if args.action=='compare':
                    specs=[(u,k,'natural' if k=='C4' else 'row-lock-gate') for u in ('count','g') for k in ('C1','C2','C4')]
                    variants=[('baseline',BASELINE),('lock',BASE/'candidates/candidate_lock.sql'),('atomic',BASE/'candidates/candidate_atomic.sql')]
                    result['runs']=[]
                    for name,p in variants:
                        r=execute(c,name,p,specs,1); result['runs'].append(r)
                        if r.get('stopped'): break
                else:
                    specs=[('count','C0','natural'),('count','C1','natural'),('count','C1','row-lock-gate'),
                        ('g','C1','row-lock-gate'),('count','C2','natural'),('count','C2','row-lock-gate'),
                        ('g','C2','row-lock-gate'),('count','C4','natural')]
                    result['runs']=[]
                    for name,p in [('baseline',BASELINE),('selected',SELECTED)]:
                        r=execute(c,name,p,specs,3); result['runs'].append(r)
                        if r.get('stopped'): break
    except Exception as e: result.update(blocked=str(e))
    h.write_result(args.output,result)
    print(json.dumps({'action':args.action,'output':args.output,'blocked':result.get('blocked'),
        'runs':[{'variant':r['variant'],'trials':len(r['trials']),
           'failures':sum(bool(t['failures']) for t in r['trials']),
           'coverage_gaps':sum(bool(t['coverage_failures']) for t in r['trials'])} for r in result.get('runs',[])]}))
    return 2 if result.get('blocked') or any(r.get('stopped') for r in result.get('runs',[])) else 0
if __name__=='__main__': raise SystemExit(main())
