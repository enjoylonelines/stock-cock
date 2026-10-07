#!/usr/bin/env python3
"""Disposable-DB integration proof for the ERP Domain Lab posting boundary."""
import argparse
import concurrent.futures
import json
import os
import threading
import time
import uuid
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

BASE = Path(__file__).resolve().parent.parent
SQL = BASE / "sql"
DSN = os.environ.get("ERP_LAB_DSN", "postgresql://erp_lab_test:erp-lab-test-only@127.0.0.1:55441/erp_domain_lab")

TENANT_A = uuid.UUID("00000000-0000-0000-0000-0000000000a1")
TENANT_B = uuid.UUID("00000000-0000-0000-0000-0000000000b1")
PRODUCT_A = uuid.UUID("00000000-0000-0000-0000-000000000101")
PRODUCT_B = uuid.UUID("00000000-0000-0000-0000-000000000102")
PRODUCT_C = uuid.UUID("00000000-0000-0000-0000-000000000103")
PRODUCT_MATERIAL = uuid.UUID("00000000-0000-0000-0000-000000000104")
PRODUCT_PACKAGED = uuid.UUID("00000000-0000-0000-0000-000000000105")
WAREHOUSE_A = uuid.UUID("00000000-0000-0000-0000-000000000201")
WAREHOUSE_B = uuid.UUID("00000000-0000-0000-0000-000000000202")
WAREHOUSE_TENANT_B = uuid.UUID("00000000-0000-0000-0000-000000000203")
LOCATION_A = uuid.UUID("00000000-0000-0000-0000-000000000301")
LOCATION_B = uuid.UUID("00000000-0000-0000-0000-000000000302")
LOCATION_TENANT_B = uuid.UUID("00000000-0000-0000-0000-000000000303")


def connect():
    return psycopg.connect(DSN, autocommit=False)


def apply_schema(connection):
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA IF EXISTS erp_lab CASCADE")
        for path in (SQL / "001_inventory_document_schema.sql", SQL / "002_inventory_document_posting.sql"):
            cursor.execute(path.read_text())
    connection.commit()


def seed(connection):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO erp_lab.tenants(id, code) VALUES (%s, 'tenant-a'), (%s, 'tenant-b')", (TENANT_A, TENANT_B))
        cursor.execute(
            "INSERT INTO erp_lab.products(id, tenant_id, sku, base_unit) VALUES (%s, %s, 'finished-001', 'EA'), (%s, %s, 'finished-001', 'EA'), (%s, %s, 'finished-002', 'EA'), (%s, %s, 'material-001', 'g'), (%s, %s, 'finished-box-001', 'EA')",
            (PRODUCT_A, TENANT_A, PRODUCT_B, TENANT_B, PRODUCT_C, TENANT_A, PRODUCT_MATERIAL, TENANT_A, PRODUCT_PACKAGED, TENANT_A),
        )
        cursor.execute(
            "INSERT INTO erp_lab.product_unit_conversions(product_id, unit, base_quantity_per_unit) VALUES (%s, 'EA', 1), (%s, 'EA', 1), (%s, 'EA', 1), (%s, 'g', 1), (%s, 'kg', 1000), (%s, 'EA', 1), (%s, 'BOX', 24)",
            (PRODUCT_A, PRODUCT_B, PRODUCT_C, PRODUCT_MATERIAL, PRODUCT_MATERIAL, PRODUCT_PACKAGED, PRODUCT_PACKAGED),
        )
        cursor.execute(
            "INSERT INTO erp_lab.warehouses(id, tenant_id, code) VALUES (%s, %s, 'warehouse-a'), (%s, %s, 'warehouse-b'), (%s, %s, 'warehouse-b')",
            (WAREHOUSE_A, TENANT_A, WAREHOUSE_B, TENANT_A, WAREHOUSE_TENANT_B, TENANT_B),
        )
        cursor.execute(
            "INSERT INTO erp_lab.locations(id, tenant_id, warehouse_id, code) VALUES (%s, %s, %s, 'receiving'), (%s, %s, %s, 'picking'), (%s, %s, %s, 'receiving')",
            (LOCATION_A, TENANT_A, WAREHOUSE_A, LOCATION_B, TENANT_A, WAREHOUSE_B, LOCATION_TENANT_B, TENANT_B, WAREHOUSE_TENANT_B),
        )
    connection.commit()


def create_confirm_post(connection, tenant_id, document_type, key, lines):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT erp_lab.create_inventory_document(%s, %s, %s, %s::jsonb)",
            (tenant_id, document_type, key, Jsonb(lines)),
        )
        document_id = cursor.fetchone()[0]
        cursor.execute("SELECT erp_lab.confirm_inventory_document(%s, %s)", (document_id, tenant_id))
        cursor.execute("SELECT erp_lab.post_confirmed_document(%s, %s)", (document_id, tenant_id))
    connection.commit()
    return document_id


def balance(connection, tenant_id, product_id, location_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT quantity FROM erp_lab.inventory_balances WHERE tenant_id = %s AND product_id = %s AND location_id = %s",
            (tenant_id, product_id, location_id),
        )
        row = cursor.fetchone()
    return row[0] if row else 0


def create_confirm(connection, tenant_id, document_type, key, lines):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT erp_lab.create_inventory_document(%s, %s, %s, %s::jsonb)",
            (tenant_id, document_type, key, Jsonb(lines)),
        )
        document_id = cursor.fetchone()[0]
        cursor.execute("SELECT erp_lab.confirm_inventory_document(%s, %s)", (document_id, tenant_id))
    connection.commit()
    return document_id


def create_confirm_reversal(connection, tenant_id, reversed_document_id, key):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT erp_lab.create_reversal_document(%s, %s, %s)",
            (reversed_document_id, tenant_id, key),
        )
        document_id = cursor.fetchone()[0]
        cursor.execute("SELECT erp_lab.confirm_inventory_document(%s, %s)", (document_id, tenant_id))
    connection.commit()
    return document_id


def create_confirm_post_return(connection, tenant_id, source_document_id, key, lines):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT erp_lab.create_return_document(%s, %s, %s, %s::jsonb)",
            (source_document_id, tenant_id, key, Jsonb(lines)),
        )
        document_id = cursor.fetchone()[0]
        cursor.execute("SELECT erp_lab.confirm_inventory_document(%s, %s)", (document_id, tenant_id))
        cursor.execute("SELECT erp_lab.post_confirmed_document(%s, %s)", (document_id, tenant_id))
    connection.commit()
    return document_id


def concurrent_post(document_id, barrier):
    started = time.monotonic_ns()
    with connect() as connection:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET LOCAL erp_lab.test_post_lock_delay_ms = '250'")
                barrier.wait(timeout=5)
                cursor.execute("SELECT erp_lab.post_confirmed_document(%s, %s)", (document_id, TENANT_A))
                status = cursor.fetchone()[0]
            connection.commit()
            return {"status": status, "elapsed_ms": (time.monotonic_ns() - started) / 1_000_000}
        except Exception as error:
            connection.rollback()
            return {"status": "error", "sqlstate": getattr(error, "sqlstate", None), "message": str(error).splitlines()[0], "elapsed_ms": (time.monotonic_ns() - started) / 1_000_000}


def assert_reconciled(connection):
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM erp_lab.balance_reconciliation WHERE NOT is_reconciled")
        mismatches = cursor.fetchone()[0]
    assert mismatches == 0, f"expected no reconciliation mismatch, found {mismatches}"
    return mismatches


def run():
    result = {"dsn_scope": "fixed disposable loopback Lab DB", "cases": []}
    with connect() as connection:
        apply_schema(connection)
        seed(connection)

        receipt_lines = [{"product_id": str(PRODUCT_A), "quantity": 10, "destination_location_id": str(LOCATION_A)}]
        receipt_id = create_confirm_post(connection, TENANT_A, "receipt", "receipt-001", receipt_lines)
        result["cases"].append({"name": "receipt", "document_id": str(receipt_id), "balance": str(balance(connection, TENANT_A, PRODUCT_A, LOCATION_A))})
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 10

        with connection.cursor() as cursor:
            cursor.execute("SELECT erp_lab.create_inventory_document(%s, 'receipt', 'receipt-001', %s::jsonb)", (TENANT_A, Jsonb(receipt_lines)))
            duplicate_id = cursor.fetchone()[0]
            cursor.execute("SELECT count(*) FROM erp_lab.inventory_documents WHERE tenant_id = %s AND idempotency_key = 'receipt-001'", (TENANT_A,))
            duplicate_count = cursor.fetchone()[0]
        connection.commit()
        assert duplicate_id == receipt_id and duplicate_count == 1
        result["cases"].append({"name": "duplicate_receipt", "document_id": str(duplicate_id), "document_count": duplicate_count})

        shipment_lines = [{"product_id": str(PRODUCT_A), "quantity": 4, "source_location_id": str(LOCATION_A)}]
        shipment_id = create_confirm_post(connection, TENANT_A, "shipment", "shipment-001", shipment_lines)
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 6
        result["cases"].append({"name": "shipment", "document_id": str(shipment_id), "balance": str(balance(connection, TENANT_A, PRODUCT_A, LOCATION_A))})

        failed_transfer_id = create_confirm(connection, TENANT_A, "transfer", "transfer-too-large", [{"product_id": str(PRODUCT_A), "quantity": 7, "source_location_id": str(LOCATION_A), "destination_location_id": str(LOCATION_B)}])
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT erp_lab.post_confirmed_document(%s, %s)", (failed_transfer_id, TENANT_A))
            connection.commit()
            raise AssertionError("oversized transfer unexpectedly posted")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "P0001"
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 6
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_B) == 0
        result["cases"].append({"name": "failed_transfer_rolls_back", "source_balance": "6", "destination_balance": "0"})

        tenant_b_receipt = create_confirm_post(connection, TENANT_B, "receipt", "tenant-b-receipt", [{"product_id": str(PRODUCT_B), "quantity": 5, "destination_location_id": str(LOCATION_TENANT_B)}])
        assert balance(connection, TENANT_B, PRODUCT_B, LOCATION_TENANT_B) == 5
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 6
        result["cases"].append({"name": "tenant_partition", "document_id": str(tenant_b_receipt), "tenant_a_balance": "6", "tenant_b_balance": "5"})

        material_receipt_id = create_confirm_post(
            connection,
            TENANT_A,
            "receipt",
            "material-receipt-2kg",
            [{"product_id": str(PRODUCT_MATERIAL), "quantity": 2, "unit": "kg", "destination_location_id": str(LOCATION_A)}],
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT quantity, input_quantity, input_unit FROM erp_lab.inventory_document_lines WHERE document_id = %s",
                (material_receipt_id,),
            )
            normalized_quantity, input_quantity, input_unit = cursor.fetchone()
        assert (normalized_quantity, input_quantity, input_unit) == (2000, 2, "kg")
        create_confirm_post(
            connection,
            TENANT_A,
            "shipment",
            "material-shipment-500g",
            [{"product_id": str(PRODUCT_MATERIAL), "quantity": 500, "unit": "g", "source_location_id": str(LOCATION_A)}],
        )
        assert balance(connection, TENANT_A, PRODUCT_MATERIAL, LOCATION_A) == 1500
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT erp_lab.create_inventory_document(%s, 'adjustment_in', 'material-invalid-unit', %s::jsonb)",
                    (TENANT_A, Jsonb([{"product_id": str(PRODUCT_MATERIAL), "quantity": 1, "unit": "EA", "destination_location_id": str(LOCATION_A)}])),
                )
            connection.commit()
            raise AssertionError("invalid material unit unexpectedly accepted")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "22023"
        result["cases"].append(
            {
                "name": "material_unit_normalization",
                "receipt_input": "2 kg",
                "receipt_base_quantity": "2000 g",
                "shipment_input": "500 g",
                "balance": "1500 g",
                "invalid_unit_rejected": True,
            }
        )

        packaged_receipt_id = create_confirm_post(
            connection,
            TENANT_A,
            "receipt",
            "packaged-receipt-2box",
            [{"product_id": str(PRODUCT_PACKAGED), "quantity": 2, "unit": "BOX", "destination_location_id": str(LOCATION_A)}],
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT quantity, input_quantity, input_unit FROM erp_lab.inventory_document_lines WHERE document_id = %s",
                (packaged_receipt_id,),
            )
            normalized_quantity, input_quantity, input_unit = cursor.fetchone()
        assert (normalized_quantity, input_quantity, input_unit) == (48, 2, "BOX")
        create_confirm_post(
            connection,
            TENANT_A,
            "shipment",
            "packaged-shipment-12ea",
            [{"product_id": str(PRODUCT_PACKAGED), "quantity": 12, "unit": "EA", "source_location_id": str(LOCATION_A)}],
        )
        assert balance(connection, TENANT_A, PRODUCT_PACKAGED, LOCATION_A) == 36
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT erp_lab.create_inventory_document(%s, 'adjustment_in', 'packaged-invalid-unit', %s::jsonb)",
                    (TENANT_A, Jsonb([{"product_id": str(PRODUCT_PACKAGED), "quantity": 1, "unit": "kg", "destination_location_id": str(LOCATION_A)}])),
                )
            connection.commit()
            raise AssertionError("invalid finished-good unit unexpectedly accepted")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "22023"
        result["cases"].append(
            {
                "name": "finished_good_package_normalization",
                "receipt_input": "2 BOX",
                "receipt_base_quantity": "48 EA",
                "shipment_input": "12 EA",
                "balance": "36 EA",
                "invalid_unit_rejected": True,
            }
        )

        create_confirm_post(
            connection,
            TENANT_A,
            "receipt",
            "return-fixture-receipt",
            [{"product_id": str(PRODUCT_C), "quantity": 10, "destination_location_id": str(LOCATION_A)}],
        )
        return_source_id = create_confirm_post(
            connection,
            TENANT_A,
            "shipment",
            "return-source-shipment",
            [{"product_id": str(PRODUCT_C), "quantity": 4, "source_location_id": str(LOCATION_A)}],
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM erp_lab.inventory_document_lines WHERE document_id = %s",
                (return_source_id,),
            )
            return_source_line_id = cursor.fetchone()[0]
        return_id = create_confirm_post_return(
            connection,
            TENANT_A,
            return_source_id,
            "return-source-shipment-partial-001",
            [{"source_document_line_id": str(return_source_line_id), "quantity": 2, "destination_location_id": str(LOCATION_A)}],
        )
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_A) == 8
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT erp_lab.create_return_document(%s, %s, 'return-source-shipment-over', %s::jsonb)",
                    (
                        return_source_id,
                        TENANT_A,
                        Jsonb([{"source_document_line_id": str(return_source_line_id), "quantity": 3, "destination_location_id": str(LOCATION_A)}]),
                    ),
                )
            connection.commit()
            raise AssertionError("over-return unexpectedly created")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "P0001"
        result["cases"].append(
            {
                "name": "partial_return",
                "document_id": str(return_id),
                "source_document_id": str(return_source_id),
                "balance": "8",
                "over_return_rejected": True,
            }
        )

        create_confirm_post(
            connection,
            TENANT_A,
            "adjustment_out",
            "adjustment-out-001",
            [{"product_id": str(PRODUCT_C), "quantity": 1, "source_location_id": str(LOCATION_A)}],
        )
        create_confirm_post(
            connection,
            TENANT_A,
            "adjustment_in",
            "adjustment-in-001",
            [{"product_id": str(PRODUCT_C), "quantity": 3, "destination_location_id": str(LOCATION_A)}],
        )
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_A) == 10
        result["cases"].append({"name": "adjustments", "balance": "10"})

        multi_transfer_id = create_confirm_post(
            connection,
            TENANT_A,
            "transfer",
            "multi-transfer-001",
            [
                {"product_id": str(PRODUCT_C), "quantity": 3, "source_location_id": str(LOCATION_A), "destination_location_id": str(LOCATION_B)},
                {"product_id": str(PRODUCT_C), "quantity": 1, "source_location_id": str(LOCATION_A), "destination_location_id": str(LOCATION_B)},
            ],
        )
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_A) == 6
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_B) == 4
        failed_multi_transfer_id = create_confirm(
            connection,
            TENANT_A,
            "transfer",
            "multi-transfer-fail-001",
            [
                {"product_id": str(PRODUCT_C), "quantity": 1, "source_location_id": str(LOCATION_A), "destination_location_id": str(LOCATION_B)},
                {"product_id": str(PRODUCT_C), "quantity": 7, "source_location_id": str(LOCATION_A), "destination_location_id": str(LOCATION_B)},
            ],
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT erp_lab.post_confirmed_document(%s, %s)", (failed_multi_transfer_id, TENANT_A))
            connection.commit()
            raise AssertionError("failed multi-line transfer unexpectedly posted")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "P0001"
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_A) == 6
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_B) == 4
        result["cases"].append(
            {
                "name": "multi_line_transfer",
                "document_id": str(multi_transfer_id),
                "source_balance": "6",
                "destination_balance": "4",
                "failed_multi_line_transfer_rolled_back": True,
            }
        )

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM erp_lab.bulk_receipt_documents(%s, %s::jsonb) ORDER BY row_index",
                (
                    TENANT_A,
                    Jsonb(
                        [
                            {"idempotency_key": "bulk-receipt-valid", "lines": [{"product_id": str(PRODUCT_C), "quantity": 2, "destination_location_id": str(LOCATION_B)}]},
                            {"idempotency_key": "bulk-receipt-invalid", "lines": [{"product_id": str(PRODUCT_B), "quantity": 2, "destination_location_id": str(LOCATION_B)}]},
                        ]
                    ),
                ),
            )
            bulk_rows = cursor.fetchall()
        connection.commit()
        assert [(row[0], row[1], row[3]) for row in bulk_rows] == [(1, "POSTED", None), (2, "REJECTED", "22023")]
        assert balance(connection, TENANT_A, PRODUCT_C, LOCATION_B) == 6
        result["cases"].append(
            {
                "name": "bulk_receipt_row_policy",
                "rows": [{"row_index": row[0], "status": row[1], "error_code": row[3]} for row in bulk_rows],
                "destination_balance": "6",
            }
        )

        reversal_id = create_confirm_reversal(connection, TENANT_A, shipment_id, "shipment-001-reversal")
        shipment_while_reversing = create_confirm(
            connection,
            TENANT_A,
            "shipment",
            "shipment-during-reversal",
            [{"product_id": str(PRODUCT_A), "quantity": 6, "source_location_id": str(LOCATION_A)}],
        )

    reversal_barrier = threading.Barrier(2)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        reversal_results = list(
            executor.map(
                lambda document_id: concurrent_post(document_id, reversal_barrier),
                (reversal_id, shipment_while_reversing),
            )
        )
    assert [item["status"] for item in reversal_results].count("POSTED") == 2

    with connect() as connection:
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 4
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT status FROM erp_lab.inventory_documents WHERE id = %s",
                (shipment_id,),
            )
            original_status = cursor.fetchone()[0]
            cursor.execute(
                "SELECT status, reversed_document_id FROM erp_lab.inventory_documents WHERE id = %s",
                (reversal_id,),
            )
            reversal_status, reversed_document_id = cursor.fetchone()
            cursor.execute(
                "SELECT erp_lab.create_reversal_document(%s, %s, 'shipment-001-reversal')",
                (shipment_id, TENANT_A),
            )
            duplicate_reversal_id = cursor.fetchone()[0]
        connection.commit()
        assert original_status == "REVERSED"
        assert reversal_status == "POSTED" and reversed_document_id == shipment_id
        assert duplicate_reversal_id == reversal_id
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT erp_lab.create_reversal_document(%s, %s, 'shipment-001-second-reversal')",
                    (shipment_id, TENANT_A),
                )
            connection.commit()
            raise AssertionError("second reversal unexpectedly created")
        except psycopg.Error as error:
            connection.rollback()
            assert error.sqlstate == "P0001"
        result["cases"].append(
            {
                "name": "shipment_reversal_concurrent_with_shipment",
                "document_id": str(reversal_id),
                "original_status": original_status,
                "reversal_status": reversal_status,
                "balance_after_both_posted": "4",
                "concurrent_results": reversal_results,
                "duplicate_reversal_returns_original": True,
                "second_reversal_rejected": True,
            }
        )

        first = create_confirm(connection, TENANT_A, "shipment", "concurrent-1", [{"product_id": str(PRODUCT_A), "quantity": 3, "source_location_id": str(LOCATION_A)}])
        second = create_confirm(connection, TENANT_A, "shipment", "concurrent-2", [{"product_id": str(PRODUCT_A), "quantity": 3, "source_location_id": str(LOCATION_A)}])

    barrier = threading.Barrier(2)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        concurrent_results = list(executor.map(lambda document_id: concurrent_post(document_id, barrier), (first, second)))
    successful = [item for item in concurrent_results if item["status"] == "POSTED"]
    failed = [item for item in concurrent_results if item["status"] == "error"]
    assert len(successful) == 1 and len(failed) == 1 and failed[0]["sqlstate"] == "P0001"
    result["cases"].append({"name": "concurrent_shipment", "results": concurrent_results})

    with connect() as connection:
        assert balance(connection, TENANT_A, PRODUCT_A, LOCATION_A) == 1
        result["reconciliation_mismatches"] = assert_reconciled(connection)
        result["final_tenant_a_balance"] = str(balance(connection, TENANT_A, PRODUCT_A, LOCATION_A))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise SystemExit(f"refusing to overwrite existing result: {output}")
    try:
        result = run()
        result["status"] = "passed"
    except Exception as error:
        result = {"status": "failed", "error": repr(error)}
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "output": str(output)}))
    raise SystemExit(0 if result["status"] == "passed" else 1)


if __name__ == "__main__":
    main()
