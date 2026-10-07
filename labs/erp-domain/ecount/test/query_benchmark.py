#!/usr/bin/env python3
"""Deterministic DD-A2 read-query baseline and index comparison for the isolated Lab."""
import argparse
import json
import os
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg

BASE = Path(__file__).resolve().parent.parent
SQL = BASE / "sql"
DSN = os.environ.get("ERP_LAB_DSN", "postgresql://erp_lab_test:erp-lab-test-only@127.0.0.1:55441/erp_domain_lab")
TENANT_ID = "10000000-0000-0000-0000-000000000001"
WAREHOUSE_ID = "10000000-0000-0000-0000-000000000010"
LOCATION_A = "10000000-0000-0000-0000-000000000011"
LOCATION_B = "10000000-0000-0000-0000-000000000012"
HOT_PRODUCT_ID = "10000000-0000-0000-0000-000000000101"
PRODUCT_COUNT = 1_000
LEDGER_ROW_COUNT = 120_000
SAMPLES = 30


def connect():
    return psycopg.connect(DSN, autocommit=False)


def apply_schema(connection):
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA IF EXISTS erp_lab CASCADE")
        for path in (SQL / "001_inventory_document_schema.sql", SQL / "002_inventory_document_posting.sql"):
            cursor.execute(path.read_text())
    connection.commit()


def seed_workload(connection):
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO erp_lab.tenants(id, code) VALUES (%s, 'benchmark-tenant')",
            (TENANT_ID,),
        )
        cursor.execute(
            "INSERT INTO erp_lab.warehouses(id, tenant_id, code) VALUES (%s, %s, 'benchmark-warehouse')",
            (WAREHOUSE_ID, TENANT_ID),
        )
        cursor.execute(
            "INSERT INTO erp_lab.locations(id, tenant_id, warehouse_id, code) VALUES (%s, %s, %s, 'a'), (%s, %s, %s, 'b')",
            (LOCATION_A, TENANT_ID, WAREHOUSE_ID, LOCATION_B, TENANT_ID, WAREHOUSE_ID),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.products(id, tenant_id, sku, base_unit)
            SELECT
              CASE WHEN n = 1 THEN %s::uuid ELSE ('20000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid END,
              %s::uuid,
              'sku-' || lpad(n::text, 4, '0'),
              'EA'
            FROM generate_series(1, %s) AS n
            """,
            (HOT_PRODUCT_ID, TENANT_ID, PRODUCT_COUNT),
        )
        cursor.execute(
            """
            CREATE TEMP TABLE benchmark_seed AS
            SELECT
              n,
              gen_random_uuid() AS document_id,
              gen_random_uuid() AS line_id,
              CASE WHEN n %% 2 = 0 THEN %s::uuid ELSE ('20000000-0000-0000-0000-' || lpad((((n %% %s) + 2))::text, 12, '0'))::uuid END AS product_id,
              CASE WHEN n %% 3 = 0 THEN %s::uuid ELSE %s::uuid END AS location_id,
              now() - ((n %% 180) || ' days')::interval - ((n %% 86400) || ' seconds')::interval AS posted_at
            FROM generate_series(1, %s) AS n
            """,
            (HOT_PRODUCT_ID, PRODUCT_COUNT - 1, LOCATION_A, LOCATION_B, LEDGER_ROW_COUNT),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.inventory_documents(id, tenant_id, document_type, status, idempotency_key)
            SELECT document_id, %s::uuid, 'receipt', 'POSTED', 'benchmark-' || n
            FROM benchmark_seed
            """,
            (TENANT_ID,),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.inventory_document_lines(id, document_id, product_id, quantity, destination_location_id)
            SELECT line_id, document_id, product_id, 1, location_id
            FROM benchmark_seed
            """
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.stock_ledger(tenant_id, document_id, document_line_id, product_id, location_id, quantity_delta, posted_at)
            SELECT %s::uuid, document_id, line_id, product_id, location_id, 1, posted_at
            FROM benchmark_seed
            """,
            (TENANT_ID,),
        )
        cursor.execute(
            """
            INSERT INTO erp_lab.inventory_balances(tenant_id, product_id, location_id, quantity)
            SELECT tenant_id, product_id, location_id, SUM(quantity_delta)
            FROM erp_lab.stock_ledger
            GROUP BY tenant_id, product_id, location_id
            """
        )
        cursor.execute("ANALYZE erp_lab.stock_ledger")
        cursor.execute("ANALYZE erp_lab.inventory_balances")
    connection.commit()


QUERIES = {
    "current_stock": (
        "SELECT quantity FROM erp_lab.inventory_balances WHERE tenant_id = %s AND product_id = %s AND location_id = %s",
        (TENANT_ID, HOT_PRODUCT_ID, LOCATION_A),
    ),
    "recent_history": (
        "SELECT document_id, quantity_delta, posted_at FROM erp_lab.stock_ledger WHERE tenant_id = %s AND product_id = %s AND location_id = %s ORDER BY posted_at DESC LIMIT 100",
        (TENANT_ID, HOT_PRODUCT_ID, LOCATION_A),
    ),
    "period_movement": (
        "SELECT COALESCE(SUM(quantity_delta), 0) FROM erp_lab.stock_ledger WHERE tenant_id = %s AND product_id = %s AND location_id = %s AND posted_at >= now() - interval '30 days'",
        (TENANT_ID, HOT_PRODUCT_ID, LOCATION_A),
    ),
    "location_shortage": (
        "SELECT product_id, quantity FROM erp_lab.inventory_balances WHERE tenant_id = %s AND location_id = %s AND quantity < 50 ORDER BY quantity ASC, product_id LIMIT 100",
        (TENANT_ID, LOCATION_A),
    ),
}


def percentile(values, fraction):
    return sorted(values)[max(0, min(len(values) - 1, int((len(values) - 1) * fraction)))]


def scan_nodes(plan):
    nodes = [plan.get("Node Type")]
    for child in plan.get("Plans", []):
        nodes.extend(scan_nodes(child))
    return nodes


def measure(connection, query, parameters):
    with connection.cursor() as cursor:
        for _ in range(3):
            cursor.execute(query, parameters)
            cursor.fetchall()
        elapsed_ms = []
        for _ in range(SAMPLES):
            started = time.perf_counter_ns()
            cursor.execute(query, parameters)
            cursor.fetchall()
            elapsed_ms.append((time.perf_counter_ns() - started) / 1_000_000)
        cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}", parameters)
        explain = cursor.fetchone()[0][0]
    return {
        "samples": SAMPLES,
        "client_ms": {"p50": round(statistics.median(elapsed_ms), 3), "p95": round(percentile(elapsed_ms, 0.95), 3)},
        "db_execution_ms": round(explain["Execution Time"], 3),
        "plan_nodes": scan_nodes(explain["Plan"]),
    }


def measure_all(connection):
    return {name: measure(connection, query, parameters) for name, (query, parameters) in QUERIES.items()}


def run():
    with connect() as connection:
        apply_schema(connection)
        seed_workload(connection)
        baseline = measure_all(connection)
        with connection.cursor() as cursor:
            cursor.execute((SQL / "003_query_indexes.sql").read_text())
            cursor.execute("ANALYZE erp_lab.stock_ledger")
            cursor.execute("ANALYZE erp_lab.inventory_balances")
        connection.commit()
        indexed = measure_all(connection)
    return {
        "status": "passed",
        "workload": {
            "scope": "fixed disposable loopback Lab DB; synthetic read fixture only",
            "product_count": PRODUCT_COUNT,
            "ledger_row_count": LEDGER_ROW_COUNT,
            "locations": 2,
            "hot_product_share": "50%",
            "samples_per_query": SAMPLES,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        },
        "baseline": baseline,
        "indexed": indexed,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise SystemExit(f"refusing to overwrite existing result: {output}")
    try:
        result = run()
    except Exception as error:
        result = {"status": "failed", "error": repr(error)}
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "output": str(output)}))
    raise SystemExit(0 if result["status"] == "passed" else 1)


if __name__ == "__main__":
    main()
