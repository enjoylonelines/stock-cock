#!/usr/bin/env python3
"""L0 duplicate migration gate and bounded hot-SKU contention experiment."""
import argparse, concurrent.futures, json, statistics, threading, time, uuid
from pathlib import Path
import reference_harness as h
from psycopg.types.json import Jsonb
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
POLICY=ROOT/"supabase/migrations/20260924000000_enforce_inventory_pair_policy.sql"

def setup_without_policy(c):
    c.execute((BASE/"bootstrap.sql").read_text())
    for p in sorted((ROOT/"supabase/migrations").glob("*.sql")):
        if p.name in ("20260923000000_guard_inventory_transactions.sql","20260924000000_enforce_inventory_pair_policy.sql"):
            continue
        with c.transaction(): c.execute(p.read_text())
    c.execute("CREATE TABLE inventory_reinforcement_environment(name text PRIMARY KEY)")
    c.execute("INSERT INTO inventory_reinforcement_environment VALUES ('stock-cock-consistency-test')")

def install(c, p=POLICY):
    c.execute(p.read_text())

def duplicate_gate(c):
    f=h.fixture(c,100,False)
    option=f["options"][0]
    c.execute("INSERT INTO inventory(product_option_id,warehouse_id,quantity) SELECT product_option_id,warehouse_id,quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s", (option,f["warehouse"]))
    try:
        c.execute(POLICY.read_text())
        return {"status":"unexpected_success"}
    except Exception as e:
        c.rollback()
        idx=c.execute("SELECT count(*) FROM pg_indexes WHERE indexname='inventory_product_option_warehouse_unique'").fetchone()[0]
        return {"status":"blocked","sqlstate":getattr(e,"sqlstate",None),"error":str(e).splitlines()[0],"unique_index_after_failure":idx}

def operation(f, i):
    return {"header":{"type":"in","user_id":f["user"],"warehouse_id":f["warehouse"],"memo":f"hot:{i}"},
            "items":[{"option_id":f["options"][0],"quantity":1,"product_type":"company"}]}

def hot_trial(admin, f, n):
    release=threading.Event(); ready=0; ready_lock=threading.Lock()
    def one(i):
        try:
            with h.connection(f"hot-{n}-{i}", True) as c:
                nonlocal_ready[0] += 1
                release.wait(timeout=10)
                started_ns=time.monotonic_ns()
                c.execute("SELECT public.create_transaction(%s::jsonb,%s::jsonb)",
                           (Jsonb(operation(f,i)["header"]),Jsonb(operation(f,i)["items"]))).fetchone()
                end=time.monotonic_ns()
                return {"status":"success","latency_ms":(end-started_ns)/1e6}
        except Exception as e:
            return {"status":"error","sqlstate":getattr(e,"sqlstate",None),"error":str(e).splitlines()[0]}
    nonlocal_ready=[0]
    with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
        futures=[pool.submit(one,i) for i in range(n)]
        deadline=time.monotonic()+10
        while nonlocal_ready[0] < n and time.monotonic() < deadline: time.sleep(0.01)
        release.set()
        results=[x.result() for x in futures]
    qty=admin.execute("SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",(f["options"][0],f["warehouse"])).fetchone()[0]
    ledger=admin.execute("SELECT count(*) FROM transactions WHERE to_warehouse_id=%s", (f["warehouse"],)).fetchone()[0]
    lat=sorted(x["latency_ms"] for x in results if x["status"]=="success")
    return {"workers":n,"successes":sum(x["status"]=="success" for x in results),"errors":sum(x["status"]=="error" for x in results),
            "error_codes":sorted({x.get("sqlstate") for x in results if x["status"]=="error"}),
            "inventory_quantity":str(qty),"ledger_count":ledger,"latency_ms":{"p50":statistics.median(lat) if lat else None,"p95":lat[min(len(lat)-1,max(0,int(len(lat)*.95)-1))] if lat else None,"max":max(lat) if lat else None},
            "results":results}

def cross_writer_trial(admin, f):
    """Deterministic stale absolute-writer interleaving against create_transaction."""
    read_ready=threading.Event(); release=threading.Event(); outcome={}
    option=f["options"][0]
    def absolute_writer():
        with h.connection("absolute-writer", True) as c:
            c.execute("BEGIN")
            old=c.execute("SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s", (option,f["warehouse"])).fetchone()[0]
            outcome["read_quantity"]=str(old); read_ready.set(); release.wait(timeout=10)
            c.execute("UPDATE inventory SET quantity=%s WHERE product_option_id=%s AND warehouse_id=%s", (old+5,option,f["warehouse"]))
            c.execute("COMMIT")
    writer=threading.Thread(target=absolute_writer); writer.start(); read_ready.wait(timeout=10)
    with h.connection("cross-rpc", True) as c:
        op=operation(f,"cross-rpc")
        try:
            c.execute("SELECT public.create_transaction(%s::jsonb,%s::jsonb)", (Jsonb(op["header"]),Jsonb(op["items"]))).fetchone()
            outcome["rpc_status"]="success"
        except Exception as e:
            outcome["rpc_status"]="error"; outcome["rpc_sqlstate"]=getattr(e,"sqlstate",None); outcome["rpc_error"]=str(e).splitlines()[0]
    release.set(); writer.join(timeout=10)
    final=admin.execute("SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s", (option,f["warehouse"])).fetchone()[0]
    ledger=admin.execute("SELECT coalesce(sum(i.quantity),0) FROM transactions t JOIN transaction_items i ON i.transaction_id=t.id WHERE t.to_warehouse_id=%s", (f["warehouse"],)).fetchone()[0]
    return {"initial":"100","rpc_delta":"1","absolute_writer_delta":"5","rpc_status":outcome.get("rpc_status"),"rpc_sqlstate":outcome.get("rpc_sqlstate"),"rpc_error":outcome.get("rpc_error"),"final_quantity":str(final),"ledger_delta":str(ledger),"expected_quantity":"106","invariant_holds":str(final)=="106"}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); args=ap.parse_args()
    out={}
    with h.connection("limits-admin") as c:
        for schema in ("public", "auth", "storage"):
            c.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        c.execute("CREATE SCHEMA public")
        setup_without_policy(c); out["l0_duplicate_gate"]=duplicate_gate(c)
        # Recreate clean schema so the policy and hot trials run against a valid install.
        for schema in ("public","auth","storage"):
            c.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        c.execute("CREATE SCHEMA public"); setup_without_policy(c); install(c)
        out["l1_hot_sku"]=[]
        for n in (2,4,8):
            f=h.fixture(c,100,False)
            out["l1_hot_sku"].append(hot_trial(c,f,n))
        f=h.fixture(c,100,False)
        out["l1_cross_writer"] = cross_writer_trial(c,f)
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"output":args.output,"l0":out["l0_duplicate_gate"]["status"],"hot":[(x["workers"],x["successes"],x["errors"],x["inventory_quantity"]) for x in out["l1_hot_sku"]]}))
if __name__=="__main__": main()
