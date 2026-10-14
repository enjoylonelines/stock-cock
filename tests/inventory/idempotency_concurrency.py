#!/usr/bin/env python3
"""Concurrent identical sales retries; disposable DB only."""
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


ATTEMPTS = 100


def call(connection, sql, args=()):
    return connection.execute(sql, args).fetchone()[0]


def ensure_policy(admin):
    r.guard(admin)
    if admin.execute("SELECT to_regclass('public.inventory_product_option_warehouse_unique')").fetchone()[0] is None:
        r.install(admin, r.POLICY)


def invoke(index, phase, fixture, document_id, idempotency_key, barrier, worker_pids):
    connection = h.connection(f"idempotency-{phase}-{index}", True)
    try:
        documents.as_actor(connection, fixture["requester"] if phase == "create" else fixture["approver"])
        worker_pids.append(connection.info.backend_pid)
        barrier.wait(timeout=15)
        started_ns = time.monotonic_ns()
        try:
            if phase == "create":
                response = documents.create_sale(connection, fixture, fixture["requester"], 1, 100, idempotency_key)
            else:
                response = call(connection, "SELECT public.approve_and_reflect_inventory_document(%s)", (document_id,))
            return {"status": "success", "response": response, "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
        except Exception as exc:
            return {"status": "error", "sqlstate": getattr(exc, "sqlstate", None), "error": str(exc).splitlines()[0],
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
    finally:
        connection.close()


def run_phase(admin, phase, fixture, document_id=None, idempotency_key=None):
    worker_pids, outcomes = [], []
    barrier = threading.Barrier(ATTEMPTS + 1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=ATTEMPTS) as pool:
        futures = [pool.submit(invoke, index, phase, fixture, document_id, idempotency_key, barrier, worker_pids)
                   for index in range(ATTEMPTS)]
        barrier.wait(timeout=15)
        time.sleep(0.05)
        rows = admin.execute(
            "SELECT pid,state,wait_event_type FROM pg_stat_activity WHERE pid=ANY(%s)", (worker_pids,)
        ).fetchall()
        waiting = {pid for pid, state, wait_event_type in rows if state == "active" and wait_event_type == "Lock"}
        outcomes = [future.result(timeout=15) for future in futures]
    assert len(worker_pids) == ATTEMPTS
    return outcomes, len(waiting)


def summarize(outcomes):
    successes = [item for item in outcomes if item["status"] == "success"]
    replays = [item for item in successes if item["response"].get("idempotent_replay") is True]
    firsts = [item for item in successes if item["response"].get("idempotent_replay") is False]
    errors = [item for item in outcomes if item["status"] == "error"]
    elapsed_ms = [(item["ended_ns"] - item["started_ns"]) / 1e6 for item in outcomes]
    return {"first_count": len(firsts), "replay_count": len(replays), "error_count": len(errors),
            "document_ids": sorted({item["response"].get("document_id") for item in successes}),
            "transaction_ids": sorted({item["response"].get("transaction_id") for item in successes}),
            "p50_ms": sorted(elapsed_ms)[49], "p95_ms": sorted(elapsed_ms)[94], "max_ms": max(elapsed_ms),
            "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=f"/tmp/stock-cock-idempotency-concurrency-{uuid.uuid4()}.json")
    args = parser.parse_args()
    result = {"experiment": "100 concurrent same-idempotency-key sales create then approval retries; disposable DB only",
              "attempts": ATTEMPTS, "checks": [], "failures": []}
    try:
        with h.connection("idempotency-admin") as admin:
            ensure_policy(admin)
            fixture = documents.fixture(admin)
            with h.connection("idempotency-seed", True) as seed:
                initial = documents.create(seed, fixture, fixture["requester"], 10)
                documents.as_actor(seed, fixture["requester"])
                call(seed, "SELECT public.submit_inventory_document(%s)", (initial["document_id"],))
                documents.as_actor(seed, fixture["approver"])
                call(seed, "SELECT public.approve_and_reflect_inventory_document(%s)", (initial["document_id"],))

            idempotency_key = str(uuid.uuid4())
            create_outcomes, create_waiting = run_phase(admin, "create", fixture, idempotency_key=idempotency_key)
            created = summarize(create_outcomes)
            assert created["first_count"] == 1 and created["replay_count"] == ATTEMPTS - 1 and created["error_count"] == 0
            assert len(created["document_ids"]) == 1 and created["document_ids"][0] is not None
            document_id = created["document_ids"][0]
            assert admin.execute("SELECT count(*) FROM inventory_documents WHERE id=%s", (document_id,)).fetchone()[0] == 1
            assert admin.execute("SELECT count(*) FROM inventory_document_lines WHERE document_id=%s", (document_id,)).fetchone()[0] == 1
            assert admin.execute("SELECT count(*) FROM inventory_document_audit WHERE document_id=%s AND event_type='CREATED'", (document_id,)).fetchone()[0] == 1
            with h.connection("idempotency-submit", True) as submitter:
                documents.as_actor(submitter, fixture["requester"])
                call(submitter, "SELECT public.submit_inventory_document(%s)", (document_id,))

            approve_outcomes, approve_waiting = run_phase(admin, "approve", fixture, document_id=document_id)
            approved = summarize(approve_outcomes)
            assert approved["first_count"] == 1 and approved["replay_count"] == ATTEMPTS - 1 and approved["error_count"] == 0
            assert len(approved["transaction_ids"]) == 1 and approved["transaction_ids"][0] is not None
            transaction_id = approved["transaction_ids"][0]
            final_stock = admin.execute("SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                                        (fixture["option"], fixture["warehouse"])).fetchone()[0]
            projection_count = admin.execute("SELECT count(*) FROM sales_receivable_projections WHERE inventory_document_id=%s", (document_id,)).fetchone()[0]
            approved_audit_count = admin.execute("SELECT count(*) FROM inventory_document_audit WHERE document_id=%s AND event_type='APPROVED_AND_REFLECTED'", (document_id,)).fetchone()[0]
            assert final_stock == 9 and projection_count == 1 and approved_audit_count == 1
            result.update({"create": created | {"lock_waiting_workers": create_waiting},
                           "approve": approved | {"lock_waiting_workers": approve_waiting},
                           "document_id": document_id, "transaction_id": transaction_id, "final_stock": final_stock,
                           "projection_count": projection_count, "approved_audit_count": approved_audit_count})
            result["checks"].append("same_key_create_and_approval_retries_leave_one_document_transaction_projection_and_audit")
    except Exception as exc:
        result["failures"].append(f"{type(exc).__name__}: {exc}")
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps({"output": args.output, "create": result.get("create"), "approve": result.get("approve"),
                      "final_stock": result.get("final_stock"), "projection_count": result.get("projection_count"),
                      "approved_audit_count": result.get("approved_audit_count"), "failures": result["failures"]}, default=str))
    raise SystemExit(2 if result["failures"] else 0)


if __name__ == "__main__":
    main()
