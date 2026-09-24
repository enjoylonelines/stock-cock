#!/usr/bin/env python3
"""Bounded live validation of create_inventory_move in the guarded disposable DB."""
import argparse
import concurrent.futures
import json
import threading
import time
import uuid
from pathlib import Path

from psycopg.types.json import Jsonb
import reference_harness as h
import run as r


def fixture(c, source_quantity):
    user, source, target, product, option = [str(uuid.uuid4()) for _ in range(5)]
    c.execute("INSERT INTO auth.users(id) VALUES (%s)", (user,))
    c.execute("INSERT INTO profiles(id,name) VALUES (%s,%s)", (user, "ledgered-move-live"))
    for warehouse, name in ((source, "ledgered-move-source"), (target, "ledgered-move-target")):
        c.execute("INSERT INTO warehouses(id,name) VALUES (%s,%s)", (warehouse, name))
    c.execute("INSERT INTO products(id,name,product_type) VALUES (%s,%s,'company')", (product, "ledgered-move-product"))
    c.execute("INSERT INTO product_options(id,product_id,sku) VALUES (%s,%s,%s)", (option, product, option))
    c.execute("INSERT INTO inventory(product_option_id,warehouse_id,quantity) VALUES (%s,%s,%s)", (option, source, source_quantity))
    return dict(user=user, source=source, target=target, option=option, initial=source_quantity)


def payload(f, memo, quantity):
    return (
        dict(from_warehouse_id=f["source"], to_warehouse_id=f["target"], user_id=f["user"], memo=memo),
        [dict(option_id=f["option"], quantity=quantity, product_type="company")],
    )


def invoke(c, f, memo, quantity, barrier=None):
    header, items = payload(f, memo, quantity)
    record = dict(memo=memo, quantity=quantity, backend_pid=c.info.backend_pid)
    if barrier:
        barrier.wait(timeout=10)
    record["start_ns"] = time.monotonic_ns()
    try:
        record["response"] = c.execute(
            "SELECT public.create_inventory_move(%s::jsonb,%s::jsonb)",
            (Jsonb(header), Jsonb(items)),
        ).fetchone()[0]
        record["status"] = "success"
    except Exception as exc:
        record.update(status="error", sqlstate=getattr(exc, "sqlstate", None), error=str(exc).splitlines()[0])
    record["end_ns"] = time.monotonic_ns()
    return record


def snapshot(c, f, memos):
    inventory = c.execute(
        "SELECT warehouse_id::text,quantity,weight_in_grams FROM inventory "
        "WHERE product_option_id=%s AND warehouse_id=ANY(%s) ORDER BY warehouse_id",
        (f["option"], [f["source"], f["target"]]),
    ).fetchall()
    rows = c.execute(
        "SELECT t.id::text,t.memo,t.type,t.from_warehouse_id::text,t.to_warehouse_id::text,"
        "i.product_option_id::text,i.quantity FROM transactions t "
        "LEFT JOIN transaction_items i ON i.transaction_id=t.id WHERE t.memo=ANY(%s) ORDER BY t.memo,i.id",
        (memos,),
    ).fetchall()
    return dict(inventory=inventory, ledger=rows)


def assert_equal(label, actual, expected, failures):
    if actual != expected:
        failures.append(label)


def concurrent_case(admin):
    f = fixture(admin, 100)
    memos = [f"ledgered-move-concurrent-{uuid.uuid4()}-{i}" for i in range(2)]
    key = admin.execute(
        "SELECT hashtextextended(%s || ':' || LEAST(%s::uuid,%s::uuid)::text, 0)",
        (f["option"], f["source"], f["target"]),
    ).fetchone()[0]
    barrier = threading.Barrier(3)
    observations = []
    with h.connection("ledgered-move-gate") as gate, h.connection("ledgered-move-a", True) as a, h.connection("ledgered-move-b", True) as b:
        gate.execute("SELECT pg_advisory_lock(%s)", (key,))
        pids = [a.info.backend_pid, b.info.backend_pid]
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(invoke, c, f, memo, 60, barrier) for c, memo in zip((a, b), memos)]
                barrier.wait(timeout=10)
                deadline = time.monotonic() + 3
                while time.monotonic() < deadline:
                    states = admin.execute(
                        "SELECT pid,state,wait_event_type,wait_event FROM pg_stat_activity WHERE pid=ANY(%s)",
                        (pids,),
                    ).fetchall()
                    observations.append(states)
                    if len(states) == 2 and all(row[2] == "Lock" for row in states):
                        break
                    time.sleep(0.01)
                gate.execute("SELECT pg_advisory_unlock(%s)", (key,))
                records = [future.result(timeout=10) for future in futures]
        finally:
            gate.execute("SELECT pg_advisory_unlock_all()")
    state = snapshot(admin, f, memos)
    failures = []
    statuses = sorted((record["status"], record.get("sqlstate")) for record in records)
    assert_equal("concurrent_outcomes", statuses, [("error", "P0001"), ("success", None)], failures)
    assert_equal("source_and_destination_balance", state["inventory"], sorted([(f["source"], 40, None), (f["target"], 60, None)]), failures)
    success = next((record for record in records if record["status"] == "success"), None)
    assert_equal("single_ledger_row", len(state["ledger"]), 1, failures)
    if state["ledger"]:
        row = state["ledger"][0]
        assert_equal("ledger_shape", row[1:], (success["memo"], "move", f["source"], f["target"], f["option"], 60), failures)
        if success and row[0] != success["response"]["transaction_id"]:
            failures.append("response_transaction_id_mismatch")
    return dict(name="concurrent_same_source_60_plus_60", fixture=f, requests=records,
                lock_wait_observed=any(len(rows) == 2 and all(row[2] == "Lock" for row in rows) for rows in observations),
                observation_count=len(observations), state=state, failures=failures)


def insufficient_case(admin):
    f = fixture(admin, 10)
    memo = f"ledgered-move-insufficient-{uuid.uuid4()}"
    before = snapshot(admin, f, [memo])
    with h.connection("ledgered-move-insufficient", True) as c:
        request = invoke(c, f, memo, 11)
    after = snapshot(admin, f, [memo])
    failures = []
    assert_equal("insufficient_sqlstate", (request["status"], request.get("sqlstate"), request.get("error")),
                 ("error", "P0001", "INSUFFICIENT_STOCK"), failures)
    assert_equal("insufficient_rollback", after, before, failures)
    return dict(name="insufficient_stock", fixture=f, request=request, before=before, after=after, failures=failures)


def rollback_case(admin):
    f = fixture(admin, 100)
    memo = f"ledgered-move-trigger-rollback-{uuid.uuid4()}"
    before = snapshot(admin, f, [memo])
    admin.execute("CREATE TABLE inventory_ledgered_move_fk_target(id uuid PRIMARY KEY)")
    admin.execute("CREATE TABLE inventory_ledgered_move_fk_child(id uuid REFERENCES inventory_ledgered_move_fk_target(id))")
    admin.execute(
        "CREATE FUNCTION inventory_ledgered_move_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$ "
        "BEGIN IF NEW.product_option_id::text=current_setting('inventory_ledgered_move.fail_option',true) THEN "
        "INSERT INTO inventory_ledgered_move_fk_child VALUES(NEW.product_option_id); END IF; RETURN NEW; END $$"
    )
    admin.execute(
        "CREATE TRIGGER inventory_ledgered_move_fail_item BEFORE INSERT ON transaction_items "
        "FOR EACH ROW EXECUTE FUNCTION inventory_ledgered_move_fail_item()"
    )
    try:
        with h.connection("ledgered-move-rollback", True) as c:
            c.execute("SELECT set_config('inventory_ledgered_move.fail_option',%s,false)", (f["option"],))
            request = invoke(c, f, memo, 1)
    finally:
        admin.execute("DROP TRIGGER inventory_ledgered_move_fail_item ON transaction_items")
        admin.execute("DROP FUNCTION inventory_ledgered_move_fail_item()")
        admin.execute("DROP TABLE inventory_ledgered_move_fk_child,inventory_ledgered_move_fk_target")
    after = snapshot(admin, f, [memo])
    failures = []
    assert_equal("trigger_sqlstate", request.get("sqlstate"), "23503", failures)
    assert_equal("trigger_rollback", after, before, failures)
    return dict(name="post_inventory_mutation_fk_rollback", fixture=f, request=request, before=before, after=after, failures=failures)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = dict(experiment="ledgered create_inventory_move bounded live validation", cases=[])
    try:
        with h.connection("ledgered-move-admin") as admin:
            r.guard(admin)
            result["environment"] = dict(zip(
                ("database", "user", "version", "isolation"),
                admin.execute("SELECT current_database(),current_user,version(),current_setting('transaction_isolation')").fetchone(),
            ))
            result["function"] = admin.execute(
                "SELECT oid::regprocedure::text,prosecdef,proconfig FROM pg_proc "
                "WHERE oid='public.create_inventory_move(jsonb,jsonb)'::regprocedure"
            ).fetchone()
            for case in (concurrent_case, insufficient_case, rollback_case):
                value = case(admin)
                result["cases"].append(value)
                if value["failures"]:
                    result["stopped"] = value["name"]
                    break
    except Exception as exc:
        result["blocked"] = f"{type(exc).__name__}: {exc}"
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps(dict(output=args.output, blocked=result.get("blocked"), stopped=result.get("stopped"),
                          cases=[dict(name=x["name"], failures=x["failures"]) for x in result["cases"]])))
    raise SystemExit(2 if result.get("blocked") or result.get("stopped") else 0)


if __name__ == "__main__":
    main()
