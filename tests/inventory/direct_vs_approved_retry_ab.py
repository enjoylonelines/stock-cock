#!/usr/bin/env python3
"""A/B: legacy direct retries versus same-key approved retries; disposable DB only."""
import argparse
import concurrent.futures
import json
import threading
import time
import uuid
from pathlib import Path

from psycopg.types.json import Jsonb

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


def direct_transaction(connection, fixture, transaction_type, memo, quantity):
    documents.as_actor(connection, fixture["requester"])
    return call(connection, "SELECT public.create_transaction(%s::jsonb,%s::jsonb)", (
        Jsonb({"type": transaction_type, "user_id": fixture["requester"], "warehouse_id": fixture["warehouse"],
               "supplier_id": fixture["supplier"], "memo": memo}),
        Jsonb([{"option_id": fixture["option"], "quantity": quantity}]),
    ))


def direct_retry(index, fixture, memo, barrier):
    connection = h.connection(f"ab-direct-{index}", True)
    try:
        barrier.wait(timeout=15)
        started_ns = time.monotonic_ns()
        try:
            return {"status": "success", "response": direct_transaction(connection, fixture, "out", memo, 1),
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
        except Exception as exc:
            return {"status": "error", "sqlstate": getattr(exc, "sqlstate", None), "error": str(exc).splitlines()[0],
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
    finally:
        connection.close()


def approved_retry(index, fixture, idempotency_key, barrier):
    connection = h.connection(f"ab-approved-create-{index}", True)
    try:
        documents.as_actor(connection, fixture["requester"])
        barrier.wait(timeout=15)
        started_ns = time.monotonic_ns()
        try:
            created = documents.create_sale(connection, fixture, fixture["requester"], 1, 100, idempotency_key)
            submitted = call(connection, "SELECT public.submit_inventory_document(%s)", (created["document_id"],))
            return {"status": "success", "document_id": created["document_id"],
                    "create_replay": created["idempotent_replay"], "submit_replay": submitted["idempotent_replay"],
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
        except Exception as exc:
            return {"status": "error", "sqlstate": getattr(exc, "sqlstate", None), "error": str(exc).splitlines()[0],
                    "started_ns": started_ns, "ended_ns": time.monotonic_ns()}
    finally:
        connection.close()


def approve_retry(index, fixture, document_id, barrier):
    connection = h.connection(f"ab-approved-approve-{index}", True)
    try:
        documents.as_actor(connection, fixture["approver"])
        barrier.wait(timeout=15)
        try:
            response = call(connection, "SELECT public.approve_and_reflect_inventory_document(%s)", (document_id,))
            return {"status": "success", "response": response}
        except Exception as exc:
            return {"status": "error", "sqlstate": getattr(exc, "sqlstate", None), "error": str(exc).splitlines()[0]}
    finally:
        connection.close()


def run_concurrently(worker, *args):
    barrier = threading.Barrier(ATTEMPTS + 1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=ATTEMPTS) as pool:
        futures = [pool.submit(worker, index, *args, barrier) for index in range(ATTEMPTS)]
        barrier.wait(timeout=15)
        return [future.result(timeout=15) for future in futures]


def stock(admin, fixture):
    return admin.execute("SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                         (fixture["option"], fixture["warehouse"])).fetchone()[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=f"/tmp/stock-cock-direct-vs-approved-retry-{uuid.uuid4()}.json")
    args = parser.parse_args()
    result = {"experiment": "100 equivalent retries: direct transaction RPC versus same-key approval document; disposable DB only",
              "attempts": ATTEMPTS, "checks": [], "failures": []}
    try:
        with h.connection("ab-admin") as admin:
            ensure_policy(admin)
            direct_fixture = documents.fixture(admin)
            direct_memo = "legacy-direct-retry:" + str(uuid.uuid4())
            with h.connection("ab-direct-seed", True) as seed:
                direct_transaction(seed, direct_fixture, "in", "legacy-direct-seed", ATTEMPTS)
            direct_outcomes = run_concurrently(direct_retry, direct_fixture, direct_memo)
            direct_errors = [outcome for outcome in direct_outcomes if outcome["status"] == "error"]
            direct_transactions = admin.execute("SELECT count(*) FROM transactions WHERE memo=%s", (direct_memo,)).fetchone()[0]
            direct_stock = stock(admin, direct_fixture)
            assert not direct_errors and direct_transactions == ATTEMPTS and direct_stock == 0

            approved_fixture = documents.fixture(admin)
            with h.connection("ab-approved-seed", True) as seed:
                initial = documents.create(seed, approved_fixture, approved_fixture["requester"], ATTEMPTS)
                documents.as_actor(seed, approved_fixture["requester"])
                call(seed, "SELECT public.submit_inventory_document(%s)", (initial["document_id"],))
                documents.as_actor(seed, approved_fixture["approver"])
                call(seed, "SELECT public.approve_and_reflect_inventory_document(%s)", (initial["document_id"],))
            idempotency_key = str(uuid.uuid4())
            create_outcomes = run_concurrently(approved_retry, approved_fixture, idempotency_key)
            create_errors = [outcome for outcome in create_outcomes if outcome["status"] == "error"]
            document_ids = {outcome.get("document_id") for outcome in create_outcomes if outcome["status"] == "success"}
            assert not create_errors and len(document_ids) == 1 and None not in document_ids
            document_id = document_ids.pop()
            approve_outcomes = run_concurrently(approve_retry, approved_fixture, document_id)
            approve_errors = [outcome for outcome in approve_outcomes if outcome["status"] == "error"]
            first_approvals = [outcome for outcome in approve_outcomes if outcome["status"] == "success"
                               and outcome["response"]["idempotent_replay"] is False]
            replay_approvals = [outcome for outcome in approve_outcomes if outcome["status"] == "success"
                                and outcome["response"]["idempotent_replay"] is True]
            approved_transactions = admin.execute("SELECT count(*) FROM transactions WHERE id=(SELECT transaction_id FROM inventory_documents WHERE id=%s)", (document_id,)).fetchone()[0]
            projection_count = admin.execute("SELECT count(*) FROM sales_receivable_projections WHERE inventory_document_id=%s", (document_id,)).fetchone()[0]
            approved_stock = stock(admin, approved_fixture)
            assert not approve_errors and len(first_approvals) == 1 and len(replay_approvals) == ATTEMPTS - 1
            assert approved_transactions == 1 and projection_count == 1 and approved_stock == ATTEMPTS - 1
            result.update({
                "direct": {"transaction_writes": direct_transactions, "stock_decrements": ATTEMPTS - int(direct_stock),
                           "duplicate_applied_writes": direct_transactions - 1, "error_count": len(direct_errors)},
                "approved": {"document_count": 1, "transaction_writes": approved_transactions,
                             "stock_decrements": ATTEMPTS - int(approved_stock), "projection_count": projection_count,
                             "first_approval_count": len(first_approvals), "approval_replay_count": len(replay_approvals),
                             "duplicate_applied_writes": approved_transactions - 1,
                             "create_error_count": len(create_errors), "approve_error_count": len(approve_errors)},
                "transaction_write_reduction_percent": 99,
                "duplicate_write_elimination_percent": 100,
            })
            result["checks"].append("direct_retries_write_100_transactions_while_same_key_approved_retries_write_one")
    except Exception as exc:
        result["failures"].append(f"{type(exc).__name__}: {exc}")
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps({"output": args.output, "direct": result.get("direct"), "approved": result.get("approved"),
                      "transaction_write_reduction_percent": result.get("transaction_write_reduction_percent"),
                      "duplicate_write_elimination_percent": result.get("duplicate_write_elimination_percent"),
                      "failures": result["failures"]}, default=str))
    raise SystemExit(2 if result["failures"] else 0)


if __name__ == "__main__":
    main()
