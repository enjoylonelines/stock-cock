#!/usr/bin/env python3
"""P1.1 test-only experiment: concurrent first inbound for one option/warehouse."""
import argparse, concurrent.futures, json, re, threading, time, uuid, hashlib
from pathlib import Path
import psycopg
from psycopg.types.json import Jsonb
import reference_harness as h
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
SELECTED=ROOT/"supabase/migrations/20260923000000_guard_inventory_transactions.sql"
POLICY=ROOT/"supabase/migrations/20260924000000_enforce_inventory_pair_policy.sql"
BASELINE=ROOT/"supabase/migrations/20260131110000_fix_create_transaction_rpc_signature.sql"
CONFIG=h.CONFIG

def conn(name, worker=False):
    return h.connection(name, worker)

def empty_fixture(c):
    ids=[str(uuid.uuid4()) for _ in range(3)]
    user, warehouse, product=ids
    option=str(uuid.uuid4())
    c.execute("INSERT INTO auth.users(id) VALUES (%s)",(user,))
    c.execute("INSERT INTO profiles(id,name) VALUES (%s,%s)",(user,"p1.1"))
    c.execute("INSERT INTO warehouses(id,name) VALUES (%s,%s)",(warehouse,"p1.1"))
    c.execute("INSERT INTO products(id,name,product_type) VALUES (%s,%s,%s)",(product,"p1.1","company"))
    c.execute("INSERT INTO product_options(id,product_id,sku) VALUES (%s,%s,%s)",(option,product,option))
    return dict(user=user,warehouse=warehouse,option=option)

def op(f,i,qty=10):
    return {"header":{"type":"in","user_id":f["user"],"warehouse_id":f["warehouse"],"memo":f"p1.1:{i}"},
            "items":[{"option_id":f["option"],"quantity":qty,"product_type":"company"}]}

def invoke(c, operation, barrier):
    rec={"operation":operation["header"]["memo"],"start_ns":None}
    barrier.wait(timeout=10); rec["start_ns"]=time.monotonic_ns()
    try:
        rec["response"]=c.execute("SELECT public.create_transaction(%s::jsonb,%s::jsonb)",
                                  (Jsonb(operation["header"]),Jsonb(operation["items"]))).fetchone()[0]
        rec["status"]="success"
    except Exception as e:
        rec.update(status="error",sqlstate=getattr(e,"sqlstate",None),error=str(e))
    rec["end_ns"]=time.monotonic_ns(); return rec

def run_pair(admin,f):
    barrier=threading.Barrier(3)
    with conn("p1.1-a",True) as a, conn("p1.1-b",True) as b:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            fs=[pool.submit(invoke,c,op(f,i),barrier) for i,c in enumerate((a,b))]
            barrier.wait(timeout=10); records=[x.result() for x in fs]
    rows=admin.execute("SELECT id,quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                       (f["option"],f["warehouse"])).fetchall()
    led=admin.execute("SELECT count(*),coalesce(sum(i.quantity),0) FROM transactions t JOIN transaction_items i ON i.transaction_id=t.id WHERE t.memo LIKE 'p1.1:%'").fetchone()
    return {"requests":records,"inventory_rows":[[str(x),str(q)] for x,q in rows],
            "transaction_count":led[0],"ledger_quantity":str(led[1]),
            "client_intervals_overlap":max(x["start_ns"] for x in records)<min(x["end_ns"] for x in records)}

def advisory_variant():
    text=SELECTED.read_text()
    needle="""      -- Preserve single-request creation. No uniqueness/upsert guarantee is added here.
      INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
      VALUES(v_option_id,v_warehouse_id,
        CASE WHEN v_product_type<>'material' THEN v_qty END,
        CASE WHEN v_product_type='material' THEN v_qty::integer END);"""
    repl="""      -- Test candidate only: serialize the missing-row decision for this pair.
      PERFORM pg_advisory_xact_lock(hashtextextended(v_option_id::text || ':' || v_warehouse_id::text, 0));
      SELECT id,quantity,weight_in_grams INTO v_inv_id,v_quantity,v_grams
        FROM public.inventory WHERE product_option_id=v_option_id AND warehouse_id=v_warehouse_id;
      IF NOT FOUND THEN
        INSERT INTO public.inventory(product_option_id,warehouse_id,quantity,weight_in_grams)
        VALUES(v_option_id,v_warehouse_id,
          CASE WHEN v_product_type<>'material' THEN v_qty END,
          CASE WHEN v_product_type='material' THEN v_qty::integer END);
      END IF;"""
    if needle not in text: raise RuntimeError("selected insertion branch changed")
    return text.replace(needle,repl)

def install(c,p):
    c.execute(p)
    return hashlib.sha256(p.encode()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--output",required=True); args=ap.parse_args()
    out={"experiment":"P1.1 concurrent first inbound","variants":[]}
    with conn("p1.1-admin") as c:
        for name,sql in [("baseline",BASELINE.read_text()),("selected",SELECTED.read_text()),("advisory-test-candidate",advisory_variant()),("policy",POLICY.read_text())]:
            # truncate only after each variant; fixture is isolated by random ids.
            for schema in ("public", "auth", "storage"):
                c.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
            c.execute("CREATE SCHEMA public")
            # Recreate test schema and all repo migrations except selected, then install variant.
            c.execute((BASE/"bootstrap.sql").read_text())
            for p in sorted((ROOT/"supabase/migrations").glob("*.sql")):
                if p.name in ("20260923000000_guard_inventory_transactions.sql", "20260924000000_enforce_inventory_pair_policy.sql"): continue
                with c.transaction(): c.execute(p.read_text())
            c.execute("CREATE TABLE inventory_reinforcement_environment(name text PRIMARY KEY)")
            c.execute("INSERT INTO inventory_reinforcement_environment VALUES ('stock-cock-consistency-test')")
            install(c,sql)
            f=empty_fixture(c); result=run_pair(c,f)
            out["variants"].append({"name":name,"sql_sha256":hashlib.sha256(sql.encode()).hexdigest(),"result":result})
    Path(args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"output":args.output,"variants":[{"name":v["name"],"rows":len(v["result"]["inventory_rows"]),"transactions":v["result"]["transaction_count"],"ledger_quantity":v["result"]["ledger_quantity"]} for v in out["variants"]]}))
if __name__=="__main__": main()
