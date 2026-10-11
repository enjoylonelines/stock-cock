#!/usr/bin/env python3
"""Measures the DB-backed import job against the recorded synchronous baseline."""
import json
import time
import argparse
from pathlib import Path

from psycopg.types.json import Jsonb

from capacity_benchmark import LOCATION_A, TENANT_ID, apply_schema, connect, product_id, reconcile, seed_fixture

ROWS = 50_000


def rows():
    result = []
    for index in range(ROWS):
        result.append({"idempotency_key": f"durable-import-{index}", "lines": [{"product_id": product_id(index % 1000 + 1), "quantity": 1, "unit": "EA", "destination_location_id": LOCATION_A}]})
    result[-1]["lines"][0]["unit"] = "INVALID"
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chunk-size", type=int, default=1_000)
    parser.add_argument("--set-based", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.chunk_size <= 0:
        raise SystemExit("chunk size must be positive")
    output = args.output
    worker_function = "erp_lab.process_receipt_import_job_chunk_set_based" if args.set_based else "erp_lab.process_import_job_chunk"
    if output.exists():
        raise SystemExit(f"refusing to overwrite {output}")
    payload = rows()
    with connect() as connection:
        apply_schema(connection)
        seed_fixture(connection)
        started = time.perf_counter_ns()
        with connection.cursor() as cursor:
            cursor.execute("SELECT erp_lab.create_import_job(%s, %s, %s::jsonb)", (TENANT_ID, "durable-import-50k-v1", Jsonb(payload)))
            job_id = str(cursor.fetchone()[0])
        connection.commit()
        enqueue_ms = (time.perf_counter_ns() - started) / 1_000_000
        with connection.cursor() as cursor:
            cursor.execute("SELECT erp_lab.claim_import_job(%s)", (job_id,))
            first_token = cursor.fetchone()[0]
        connection.commit()
        worker_started = time.perf_counter_ns()
        chunks_before_interrupt = 3
        for _ in range(chunks_before_interrupt):
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT * FROM {worker_function}(%s, %s, %s)", (job_id, first_token, args.chunk_size))
                cursor.fetchone()
            connection.commit()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE erp_lab.import_jobs SET lease_expires_at = now() - interval '1 second' WHERE id = %s", (job_id,))
            cursor.execute("SELECT erp_lab.claim_import_job(%s)", (job_id,))
            resumed_token = cursor.fetchone()[0]
        connection.commit()
        completed = False
        while not completed:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT * FROM {worker_function}(%s, %s, %s)", (job_id, resumed_token, args.chunk_size))
                _, _, _, completed = cursor.fetchone()
            connection.commit()
        worker_ms = (time.perf_counter_ns() - worker_started) / 1_000_000
        with connection.cursor() as cursor:
            cursor.execute("SELECT status, requested_count, processed_count, posted_count, rejected_count FROM erp_lab.import_jobs WHERE id = %s", (job_id,))
            status, requested, processed, posted, rejected = cursor.fetchone()
            cursor.execute("SELECT count(*) FROM erp_lab.import_job_rows WHERE job_id = %s AND terminal_status IS NULL", (job_id,))
            pending = cursor.fetchone()[0]
        reconciliation = reconcile(connection)
    result = {"status": "passed" if status == "COMPLETED_WITH_REJECTIONS" and requested == processed and posted == ROWS - 1 and rejected == 1 and pending == 0 and reconciliation["reconciliation_mismatches"] == 0 and reconciliation["posted_without_ledger"] == 0 else "failed", "scope": "disposable DB; direct DB job-command measurement, not HTTP", "baseline": {"sync_50k": "60-second budget breached after 27600/27600/27700 rows"}, "job": {"id": job_id, "worker": "set_based_receipt" if args.set_based else "row_workflow", "status": status, "requested": requested, "processed": processed, "posted": posted, "rejected": rejected, "pending": pending, "chunk_size": args.chunk_size, "chunks_before_forced_lease_expiry": chunks_before_interrupt, "lease_changed": str(first_token) != str(resumed_token)}, "timing": {"enqueue_ms": round(enqueue_ms, 3), "worker_elapsed_ms": round(worker_ms, 3), "worker_rows_per_second": round(ROWS / (worker_ms / 1000), 3)}, "reconciliation": reconciliation}
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
    raise SystemExit(0 if result["status"] == "passed" else 1)


if __name__ == "__main__":
    main()
