#!/usr/bin/env python3
"""Controlled capacity-boundary harness for the isolated ECOUNT ERP Lab.

It intentionally measures a direct bulk-receipt database profile separately
from TypeScript HTTP profiles. A direct database result is never reported as
HTTP upload capacity. Every profile rebuilds the disposable schema, keeps a
synthetic fixture, and verifies ledger/balance reconciliation after the run.
"""

import argparse
import concurrent.futures
import json
import os
import platform
import random
import signal
import statistics
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import psycopg
from psycopg.types.json import Jsonb

BASE = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE.parents[2]
SQL = BASE / "sql"
DSN = os.environ.get("ERP_LAB_DSN", "postgresql://erp_lab_test:erp-lab-test-only@127.0.0.1:55441/erp_domain_lab")
HTTP_PORT = int(os.environ.get("ERP_LAB_CAPACITY_PORT", "55443"))
HTTP_BASE_URL = f"http://127.0.0.1:{HTTP_PORT}"
TENANT_ID = "30000000-0000-0000-0000-000000000001"
WAREHOUSE_ID = "30000000-0000-0000-0000-000000000010"
LOCATION_A = "30000000-0000-0000-0000-000000000011"
LOCATION_B = "30000000-0000-0000-0000-000000000012"
PRODUCT_COUNT = 1_000


def connect():
    return psycopg.connect(DSN, autocommit=False)


def percentile(values, fraction):
    ordered = sorted(values)
    return ordered[max(0, min(len(ordered) - 1, int((len(ordered) - 1) * fraction)))] if ordered else None


def apply_schema(connection):
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA IF EXISTS erp_lab CASCADE")
        for path in (SQL / "001_inventory_document_schema.sql", SQL / "002_inventory_document_posting.sql", SQL / "004_durable_import_jobs.sql"):
            cursor.execute(path.read_text())
    connection.commit()


def product_id(index):
    return f"30000000-0000-0000-0000-{index:012d}"


def seed_fixture(connection):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO erp_lab.tenants(id, code) VALUES (%s, 'capacity-tenant')", (TENANT_ID,))
        cursor.execute(
            "INSERT INTO erp_lab.warehouses(id, tenant_id, code) VALUES (%s, %s, 'capacity-warehouse')",
            (WAREHOUSE_ID, TENANT_ID),
        )
        cursor.execute(
            "INSERT INTO erp_lab.locations(id, tenant_id, warehouse_id, code) VALUES (%s, %s, %s, 'a'), (%s, %s, %s, 'b')",
            (LOCATION_A, TENANT_ID, WAREHOUSE_ID, LOCATION_B, TENANT_ID, WAREHOUSE_ID),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.products(id, tenant_id, sku, base_unit)
            SELECT ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
                   %s::uuid, 'capacity-sku-' || lpad(n::text, 4, '0'), 'EA'
              FROM generate_series(1, %s) AS n
            """,
            (TENANT_ID, PRODUCT_COUNT),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.product_unit_conversions(product_id, unit, base_quantity_per_unit)
            SELECT id, 'EA', 1 FROM erp_lab.products WHERE tenant_id = %s
            """,
            (TENANT_ID,),
        )
    connection.commit()


def reconcile(connection):
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM erp_lab.balance_reconciliation WHERE NOT is_reconciled")
        mismatches = cursor.fetchone()[0]
        cursor.execute("SELECT count(*) FROM erp_lab.inventory_documents WHERE tenant_id = %s", (TENANT_ID,))
        documents = cursor.fetchone()[0]
        cursor.execute("SELECT count(*) FROM erp_lab.stock_ledger WHERE tenant_id = %s", (TENANT_ID,))
        ledger_rows = cursor.fetchone()[0]
        cursor.execute("SELECT count(*) FROM erp_lab.inventory_documents WHERE tenant_id = %s AND status = 'POSTED'", (TENANT_ID,))
        posted_documents = cursor.fetchone()[0]
        cursor.execute("SELECT count(DISTINCT document_id) FROM erp_lab.stock_ledger WHERE tenant_id = %s", (TENANT_ID,))
        ledger_documents = cursor.fetchone()[0]
        cursor.execute(
            """
            SELECT count(*)
              FROM erp_lab.inventory_documents AS document
             WHERE document.tenant_id = %s
               AND document.status = 'POSTED'
               AND NOT EXISTS (
                   SELECT 1 FROM erp_lab.stock_ledger AS ledger
                    WHERE ledger.document_id = document.id
               )
            """,
            (TENANT_ID,),
        )
        posted_without_ledger = cursor.fetchone()[0]
    return {
        "reconciliation_mismatches": mismatches,
        "documents": documents,
        "ledger_rows": ledger_rows,
        "posted_documents": posted_documents,
        "ledger_documents": ledger_documents,
        "posted_without_ledger": posted_without_ledger,
    }


def telemetry_snapshot(connection):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT count(*) FILTER (WHERE state = 'active'),
                   count(*) FILTER (WHERE state = 'active' AND wait_event_type IS NOT NULL),
                   count(*) FILTER (WHERE state = 'active' AND wait_event_type = 'Lock')
              FROM pg_stat_activity
             WHERE datname = current_database()
            """
        )
        active, waiting, lock_waiting = cursor.fetchone()
        cursor.execute("SELECT xact_commit, xact_rollback, blks_read, blks_hit FROM pg_stat_database WHERE datname = current_database()")
        commits, rollbacks, blocks_read, blocks_hit = cursor.fetchone()
        cursor.execute("SELECT pg_database_size(current_database())")
        database_size_bytes = cursor.fetchone()[0]
    return {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "active_sessions": active,
        "active_wait_event_sessions": waiting,
        "lock_waiting_sessions": lock_waiting,
        "xact_commit": commits,
        "xact_rollback": rollbacks,
        "blocks_read": blocks_read,
        "blocks_hit": blocks_hit,
        "database_size_bytes": database_size_bytes,
    }


class TelemetrySampler:
    def __init__(self):
        self.samples = []
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)

    def _run(self):
        while not self.stop_event.is_set():
            try:
                with connect() as connection:
                    self.samples.append(telemetry_snapshot(connection))
            except Exception as error:  # evidence must preserve unavailable telemetry
                self.samples.append({"recorded_at": datetime.now(timezone.utc).isoformat(), "unavailable": repr(error)})
            self.stop_event.wait(1)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=3)


def make_rows(total_rows, hot_key, key_prefix):
    rows = []
    for index in range(total_rows):
        product_index = 1 if hot_key and index % 2 == 0 else (index % PRODUCT_COUNT) + 1
        rows.append(
            {
                "idempotency_key": f"{key_prefix}-{index:08d}",
                "lines": [{"product_id": product_id(product_index), "quantity": 1, "unit": "EA", "destination_location_id": LOCATION_A}],
            }
        )
    return rows


def run_import(connection, total_rows, chunk_size, hot_key, max_elapsed_seconds):
    rows = make_rows(total_rows, hot_key, f"capacity-import-{uuid.uuid4()}")
    expected_rejected = 0
    # One known invalid unit exercises row accounting without changing the volume ladder.
    if rows:
        rows[-1]["lines"][0]["unit"] = "INVALID_UNIT"
        expected_rejected = 1
    terminal_rows = []
    started = time.perf_counter_ns()
    time_budget_breached = False
    for offset in range(0, len(rows), chunk_size):
        chunk = rows[offset : offset + chunk_size]
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM erp_lab.bulk_receipt_documents(%s, %s::jsonb) ORDER BY row_index", (TENANT_ID, Jsonb(chunk)))
            terminal_rows.extend(cursor.fetchall())
        connection.commit()
        if (time.perf_counter_ns() - started) / 1_000_000_000 > max_elapsed_seconds:
            time_budget_breached = True
            break
    elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000
    statuses = {"POSTED": 0, "REJECTED": 0}
    for _, status, _, _ in terminal_rows:
        statuses[status] = statuses.get(status, 0) + 1
    before_replay = reconcile(connection)
    replay_elapsed_ms = None
    replay_document_delta = None
    replay_ledger_delta = None
    if not time_budget_breached:
        replay_started = time.perf_counter_ns()
        for offset in range(0, len(rows), chunk_size):
            chunk = rows[offset : offset + chunk_size]
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM erp_lab.bulk_receipt_documents(%s, %s::jsonb)", (TENANT_ID, Jsonb(chunk)))
                cursor.fetchall()
            connection.commit()
        replay_elapsed_ms = (time.perf_counter_ns() - replay_started) / 1_000_000
        after_replay = reconcile(connection)
        replay_document_delta = after_replay["documents"] - before_replay["documents"]
        replay_ledger_delta = after_replay["ledger_rows"] - before_replay["ledger_rows"]
    return {
        "operation": "direct_bulk_receipt",
        "total_rows": total_rows,
        "chunk_size": chunk_size,
        "hot_key_share": "50%" if hot_key else "uniform",
        "completed_rows": len(terminal_rows),
        "terminal_results": statuses,
        "expected_rejected": expected_rejected,
        "max_elapsed_seconds": max_elapsed_seconds,
        "time_budget_breached": time_budget_breached,
        "elapsed_ms": round(elapsed_ms, 3),
        "rows_per_second": round(total_rows / (elapsed_ms / 1000), 3) if elapsed_ms else None,
        "replay_elapsed_ms": round(replay_elapsed_ms, 3) if replay_elapsed_ms is not None else None,
        "replay_document_delta": replay_document_delta,
        "replay_ledger_delta": replay_ledger_delta,
    }


def post_json(method, path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(f"{HTTP_BASE_URL}{path}", data=body, method=method, headers={"content-type": "application/json"} if body else {})
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.loads(response.read())
    except HTTPError as error:
        return error.code, json.loads(error.read())
    except URLError as error:
        return 599, {"code": "CLIENT_CONNECTION_ERROR", "message": str(error)}


def wait_for_http(process):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"HTTP server stopped early: {process.stdout.read() if process.stdout else ''}")
        try:
            status, _ = post_json("GET", "/healthz")
            if status == 200:
                return
        except Exception:
            pass
        time.sleep(0.1)
    raise RuntimeError("ERP Lab HTTP server did not become healthy")


def start_http_server():
    environment = {**os.environ, "ERP_LAB_DSN": DSN, "ERP_LAB_PORT": str(HTTP_PORT)}
    process = subprocess.Popen(
        ["pnpm", "lab:erp:http"],
        cwd=REPO_ROOT,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,
    )
    wait_for_http(process)
    return process


def stop_http_server(process):
    if process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)


def create_posted_document(connection, key):
    rows = [{"idempotency_key": key, "lines": [{"product_id": product_id(1), "quantity": 1, "unit": "EA", "destination_location_id": LOCATION_A}]}]
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM erp_lab.bulk_receipt_documents(%s, %s::jsonb)", (TENANT_ID, Jsonb(rows)))
        document_id = cursor.fetchone()[2]
    connection.commit()
    return str(document_id)


def http_write_workflow(sequence):
    started = time.perf_counter_ns()
    key = f"capacity-http-write-{sequence}-{uuid.uuid4()}"
    payload = {
        "tenantId": TENANT_ID,
        "type": "receipt",
        "idempotencyKey": key,
        "lines": [{"productId": product_id(1), "quantity": 1, "unit": "EA", "destinationLocationId": LOCATION_A}],
    }
    status, created = post_json("POST", "/lab/erp/inventory-documents", payload)
    if status != 201:
        return {"operation_type": "write", "kind": "unexpected_error", "status": status, "elapsed_ms": (time.perf_counter_ns() - started) / 1_000_000}
    document_id = created["document"]["id"]
    status, _ = post_json("POST", f"/lab/erp/inventory-documents/{document_id}/confirm", {"tenantId": TENANT_ID})
    if status != 200:
        return {"operation_type": "write", "kind": "unexpected_error", "status": status, "elapsed_ms": (time.perf_counter_ns() - started) / 1_000_000}
    status, _ = post_json("POST", f"/lab/erp/inventory-documents/{document_id}/post", {"tenantId": TENANT_ID})
    return {"operation_type": "write", "kind": "success" if status == 200 else "unexpected_error", "status": status, "elapsed_ms": (time.perf_counter_ns() - started) / 1_000_000}


def http_read_document(document_id):
    started = time.perf_counter_ns()
    status, _ = post_json("GET", f"/lab/erp/inventory-documents/{document_id}?{urlencode({'tenantId': TENANT_ID})}")
    return {"operation_type": "read", "kind": "success" if status == 200 else "unexpected_error", "status": status, "elapsed_ms": (time.perf_counter_ns() - started) / 1_000_000}


def run_http_profile(profile, concurrency, duration_seconds, connection):
    read_ids = [create_posted_document(connection, f"capacity-read-seed-{index}") for index in range(20)]
    started = time.monotonic()
    sequence = 0
    sequence_lock = threading.Lock()

    def run_one():
        nonlocal sequence
        with sequence_lock:
            sequence += 1
            current = sequence
        if profile == "http-read":
            return http_read_document(read_ids[current % len(read_ids)])
        if profile == "http-write":
            return http_write_workflow(current)
        if current % 5 == 0:
            return http_write_workflow(current)
        return http_read_document(read_ids[current % len(read_ids)])

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = set()
        while time.monotonic() - started < duration_seconds or futures:
            while time.monotonic() - started < duration_seconds and len(futures) < concurrency:
                futures.add(executor.submit(run_one))
            if not futures:
                continue
            done, futures = concurrent.futures.wait(futures, return_when=concurrent.futures.FIRST_COMPLETED)
            results.extend(future.result() for future in done)
    latencies = [result["elapsed_ms"] for result in results]
    successes = sum(result["kind"] == "success" for result in results)
    by_operation = {}
    for operation_type in ("read", "write"):
        operation_results = [result for result in results if result["operation_type"] == operation_type]
        if not operation_results:
            continue
        operation_latencies = [result["elapsed_ms"] for result in operation_results]
        by_operation[operation_type] = {
            "request_count": len(operation_results),
            "success_count": sum(result["kind"] == "success" for result in operation_results),
            "unexpected_error_count": sum(result["kind"] != "success" for result in operation_results),
            "client_latency_ms": {
                "p50": round(statistics.median(operation_latencies), 3),
                "p95": round(percentile(operation_latencies, 0.95), 3),
                "p99": round(percentile(operation_latencies, 0.99), 3),
            },
        }
    return {
        "operation": profile,
        "concurrency": concurrency,
        "duration_seconds": duration_seconds,
        "request_count": len(results),
        "success_count": successes,
        "unexpected_error_count": len(results) - successes,
        "throughput_per_second": round(len(results) / max(time.monotonic() - started, 0.001), 3),
        "client_latency_ms": {
            "p50": round(statistics.median(latencies), 3) if latencies else None,
            "p95": round(percentile(latencies, 0.95), 3) if latencies else None,
            "p99": round(percentile(latencies, 0.99), 3) if latencies else None,
        },
        "by_operation": by_operation,
    }


def environment_manifest(connection):
    with connection.cursor() as cursor:
        cursor.execute("SHOW server_version")
        postgres_version = cursor.fetchone()[0]
    try:
        page_size = os.sysconf("SC_PAGE_SIZE")
        physical_pages = os.sysconf("SC_PHYS_PAGES")
        memory_bytes = page_size * physical_pages
    except (AttributeError, ValueError, OSError):
        memory_bytes = None
    return {
        "scope": "fixed disposable loopback Lab DB; one local TypeScript process; synthetic data only",
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "platform": platform.platform(),
        "logical_cpu_count": os.cpu_count(),
        "physical_memory_bytes": memory_bytes,
        "postgres_version": postgres_version,
        "pool_max": 4,
        "git_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, text=True).strip(),
        "dirty_paths": subprocess.check_output(["git", "status", "--short"], cwd=REPO_ROOT, text=True).splitlines(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["import", "http-read", "http-write", "mixed"], required=True)
    parser.add_argument("--rows", type=int, default=1_000)
    parser.add_argument("--chunk-size", type=int, default=100)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--duration-seconds", type=int, default=5)
    parser.add_argument("--max-import-elapsed-seconds", type=int, default=60)
    parser.add_argument("--p95-limit-ms", type=float)
    parser.add_argument("--hot-key", action="store_true")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.rows <= 0 or args.chunk_size <= 0 or args.concurrency <= 0 or args.duration_seconds <= 0 or args.max_import_elapsed_seconds <= 0:
        raise SystemExit("all numeric inputs must be positive")
    output = Path(args.output)
    if output.exists():
        raise SystemExit(f"refusing to overwrite existing result: {output}")

    process = None
    result = {"status": "failed", "profile": args.profile}
    try:
        with connect() as connection:
            apply_schema(connection)
            seed_fixture(connection)
            result = {"status": "passed", "manifest": environment_manifest(connection), "profile": args.profile, "telemetry": {"before": telemetry_snapshot(connection)}}
            sampler = TelemetrySampler()
            sampler.start()
            try:
                if args.profile == "import":
                    result["measurement"] = run_import(connection, args.rows, args.chunk_size, args.hot_key, args.max_import_elapsed_seconds)
                else:
                    process = start_http_server()
                    result["measurement"] = run_http_profile(args.profile, args.concurrency, args.duration_seconds, connection)
            finally:
                sampler.stop()
                if process:
                    stop_http_server(process)
            result["telemetry"]["during"] = sampler.samples
            result["telemetry"]["after"] = telemetry_snapshot(connection)
            result["reconciliation"] = reconcile(connection)
            if result["reconciliation"]["reconciliation_mismatches"] != 0 or result["reconciliation"]["posted_without_ledger"] != 0:
                raise AssertionError("ledger/balance reconciliation mismatch")
            measurement = result["measurement"]
            if measurement.get("unexpected_error_count", 0) != 0:
                raise AssertionError("unexpected HTTP error")
            if args.profile == "import":
                result["acceptance"] = {
                    "max_elapsed_seconds": args.max_import_elapsed_seconds,
                    "completed_rows": measurement["completed_rows"],
                    "time_budget_breached": measurement["time_budget_breached"],
                }
                if measurement["time_budget_breached"]:
                    raise AssertionError(f"import time budget breached after {measurement['completed_rows']} rows")
                if measurement["terminal_results"].get("POSTED", 0) + measurement["terminal_results"].get("REJECTED", 0) != args.rows:
                    raise AssertionError("import row accounting mismatch")
                if measurement["replay_document_delta"] != 0 or measurement["replay_ledger_delta"] != 0:
                    raise AssertionError("idempotent replay added documents or ledger rows")
            else:
                if args.profile == "mixed":
                    read_p95 = measurement["by_operation"].get("read", {}).get("client_latency_ms", {}).get("p95")
                    write_p95 = measurement["by_operation"].get("write", {}).get("client_latency_ms", {}).get("p95")
                    result["acceptance"] = {"read_p95_limit_ms": 200, "read_observed_p95_ms": read_p95, "write_p95_limit_ms": 500, "write_observed_p95_ms": write_p95}
                    if read_p95 is None or write_p95 is None or read_p95 > 200 or write_p95 > 500:
                        raise AssertionError(f"mixed p95 limit breached: read={read_p95}ms write={write_p95}ms")
                else:
                    p95_limit_ms = args.p95_limit_ms if args.p95_limit_ms is not None else (200 if args.profile == "http-read" else 500)
                    observed_p95 = measurement["client_latency_ms"]["p95"]
                    result["acceptance"] = {"p95_limit_ms": p95_limit_ms, "observed_p95_ms": observed_p95}
                    if observed_p95 is None or observed_p95 > p95_limit_ms:
                        raise AssertionError(f"p95 limit breached: {observed_p95}ms > {p95_limit_ms}ms")
    except Exception as error:
        result["status"] = "failed"
        result["error"] = repr(error)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "output": str(output)}))
    raise SystemExit(0 if result["status"] == "passed" else 1)


if __name__ == "__main__":
    main()
