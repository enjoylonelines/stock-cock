#!/usr/bin/env python3
"""Gate-controlled same-SKU sales approval correctness experiment; disposable DB only."""
import argparse
import concurrent.futures
import json
import threading
import time
import uuid
from pathlib import Path

import inventory_document_workflow as documents
import reference_harness as h
import run as r


def call(c, sql, args=()):
    return c.execute(sql, args).fetchone()[0]


def ensure_policy(admin):
    r.guard(admin)
    if admin.execute("SELECT to_regclass('public.inventory_product_option_warehouse_unique')").fetchone()[0] is None:
        r.install(admin, r.POLICY)
    source = admin.execute(
        "SELECT prosrc FROM pg_proc WHERE oid='public.create_transaction(jsonb,jsonb)'::regprocedure"
    ).fetchone()[0]
    assert "pg_advisory_xact_lock" in source


def submit_sale_documents(user, fixture, attempts):
    document_ids = []
    for _ in range(attempts):
        created = documents.create_sale(user, fixture, fixture["requester"], 1, 100)
        document_ids.append(created["document_id"])
        documents.as_actor(user, fixture["requester"])
        submitted = call(user, "SELECT public.submit_inventory_document(%s)", (created["document_id"],))
        assert submitted["status"] == "PENDING_APPROVAL"
    assert len(set(document_ids)) == attempts
    return document_ids


def approve_one(index, document_id, approver_id, barrier, worker_pids):
    connection = h.connection(f"sales-concurrency-{index}", True)
    try:
        documents.as_actor(connection, approver_id)
        worker_pids.append(connection.info.backend_pid)
        barrier.wait(timeout=15)
        started_ns = time.monotonic_ns()
        try:
            response = call(connection, "SELECT public.approve_and_reflect_inventory_document(%s)", (document_id,))
            return {"document_id": document_id, "status": "success", "response": response,
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
        except Exception as exc:
            return {"document_id": document_id, "status": "error", "sqlstate": getattr(exc, "sqlstate", None),
                    "error": str(exc).splitlines()[0], "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempts", type=int, default=100)
    parser.add_argument("--initial-stock", type=int, default=50)
    parser.add_argument("--output", default=f"/tmp/stock-cock-sales-concurrency-{uuid.uuid4()}.json")
    args = parser.parse_args()
    if args.attempts != 100 or args.initial_stock != 50:
        raise SystemExit("This bounded experiment requires --attempts 100 and --initial-stock 50")

    result = {"experiment": "same SKU 100 concurrent sales approvals; disposable DB only", "attempts": args.attempts,
              "initial_stock": args.initial_stock, "checks": [], "failures": []}
    try:
        with h.connection("sales-concurrency-admin") as admin:
            ensure_policy(admin)
            with h.connection("sales-concurrency-requester", True) as requester:
                fixture = documents.fixture(admin)
                initial = documents.create(requester, fixture, fixture["requester"], args.initial_stock)
                documents.as_actor(requester, fixture["requester"])
                call(requester, "SELECT public.submit_inventory_document(%s)", (initial["document_id"],))
                documents.as_actor(requester, fixture["approver"])
                call(requester, "SELECT public.approve_and_reflect_inventory_document(%s)", (initial["document_id"],))
                document_ids = submit_sale_documents(requester, fixture, args.attempts)

            transactions_before = admin.execute("SELECT count(*) FROM transactions").fetchone()[0]
            projections_before = admin.execute("SELECT count(*) FROM sales_receivable_projections").fetchone()[0]
            admin.execute("BEGIN")
            admin.execute("SELECT id FROM inventory WHERE product_option_id=%s AND warehouse_id=%s FOR UPDATE",
                          (fixture["option"], fixture["warehouse"]))
            worker_pids = []
            barrier = threading.Barrier(args.attempts + 1)
            with concurrent.futures.ThreadPoolExecutor(max_workers=args.attempts) as pool:
                futures = [pool.submit(approve_one, index, document_id, fixture["approver"], barrier, worker_pids)
                           for index, document_id in enumerate(document_ids)]
                barrier.wait(timeout=15)
                # Hold below the harness's 5s lock_timeout: this establishes a real DB wait
                # without turning the intended business outcomes into timeout failures.
                time.sleep(0.25)
                rows = admin.execute(
                    "SELECT pid,state,wait_event_type FROM pg_stat_activity WHERE pid=ANY(%s)", (worker_pids,)
                ).fetchall()
                waiting_pids = {pid for pid, state, wait_event_type in rows if state == "active" and wait_event_type == "Lock"}
                admin.execute("ROLLBACK")
                outcomes = [future.result(timeout=15) for future in futures]

            successes = [outcome for outcome in outcomes if outcome["status"] == "success"]
            insufficient = [outcome for outcome in outcomes if outcome.get("sqlstate") == "P0001" and outcome.get("error") == "INSUFFICIENT_STOCK"]
            unexpected = [outcome for outcome in outcomes if outcome not in successes and outcome not in insufficient]
            final_stock = admin.execute(
                "SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                (fixture["option"], fixture["warehouse"]),
            ).fetchone()[0]
            transaction_delta = admin.execute("SELECT count(*) FROM transactions").fetchone()[0] - transactions_before
            projection_delta = admin.execute("SELECT count(*) FROM sales_receivable_projections").fetchone()[0] - projections_before
            reflected_count = admin.execute(
                "SELECT count(*) FROM inventory_documents WHERE id=ANY(%s) AND status='REFLECTED'", (document_ids,)
            ).fetchone()[0]
            pending_count = admin.execute(
                "SELECT count(*) FROM inventory_documents WHERE id=ANY(%s) AND status='PENDING_APPROVAL'", (document_ids,)
            ).fetchone()[0]
            result.update({"gate_waiting_workers": len(waiting_pids), "success_count": len(successes),
                           "insufficient_stock_count": len(insufficient), "unexpected_count": len(unexpected),
                           "final_stock": final_stock, "transaction_delta": transaction_delta,
                           "projection_delta": projection_delta, "reflected_count": reflected_count,
                           "pending_count": pending_count, "outcomes": outcomes})
            assert len(worker_pids) == args.attempts
            assert waiting_pids
            assert len(successes) == args.initial_stock
            assert len(insufficient) == args.attempts - args.initial_stock
            assert not unexpected
            assert final_stock == 0
            assert transaction_delta == args.initial_stock
            assert projection_delta == args.initial_stock
            assert reflected_count == args.initial_stock and pending_count == args.attempts - args.initial_stock
            result["checks"].append("100_gate_controlled_same_sku_sales_finish_with_50_successes_50_insufficient_and_no_negative_stock")
    except Exception as exc:
        result["failures"].append(f"{type(exc).__name__}: {exc}")
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps({key: result.get(key) for key in (
        "output", "attempts", "initial_stock", "gate_waiting_workers", "success_count", "insufficient_stock_count",
        "unexpected_count", "final_stock", "transaction_delta", "projection_delta", "reflected_count", "pending_count", "failures"
    )} | {"output": args.output}, default=str))
    raise SystemExit(2 if result["failures"] else 0)


if __name__ == "__main__":
    main()
