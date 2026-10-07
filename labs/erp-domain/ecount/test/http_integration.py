#!/usr/bin/env python3
"""Disposable-DB HTTP proof for the TypeScript ERP inventory workflow."""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import psycopg

from posting_integration import (
    LOCATION_A,
    PRODUCT_MATERIAL,
    PRODUCT_PACKAGED,
    TENANT_A,
    TENANT_B,
    apply_schema,
    assert_reconciled,
    connect,
    seed,
)

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE.parents[2]
DSN = os.environ.get("ERP_LAB_DSN", "postgresql://erp_lab_test:erp-lab-test-only@127.0.0.1:55441/erp_domain_lab")
PORT = int(os.environ.get("ERP_LAB_HTTP_PORT", "55442"))
BASE_URL = f"http://127.0.0.1:{PORT}"


def request_json(method, path, body=None):
    payload = json.dumps(body).encode() if body is not None else None
    request = Request(
        f"{BASE_URL}{path}",
        data=payload,
        method=method,
        headers={"content-type": "application/json"} if payload is not None else {},
    )
    try:
        with urlopen(request, timeout=3) as response:
            return response.status, json.loads(response.read())
    except HTTPError as error:
        return error.code, json.loads(error.read())


def wait_for_health(process):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise AssertionError(f"HTTP server exited before ready: {output}")
        try:
            status, body = request_json("GET", "/healthz")
            if status == 200 and body == {"ok": True}:
                return
        except URLError:
            time.sleep(0.1)
    raise AssertionError("HTTP server did not become ready within 10 seconds")


def create_confirm_post(payload):
    status, created = request_json("POST", "/lab/erp/inventory-documents", payload)
    assert status == 201, created
    document_id = created["document"]["id"]
    tenant_body = {"tenantId": payload["tenantId"]}
    status, confirmed = request_json("POST", f"/lab/erp/inventory-documents/{document_id}/confirm", tenant_body)
    assert status == 200 and confirmed["document"]["status"] == "CONFIRMED", confirmed
    status, posted = request_json("POST", f"/lab/erp/inventory-documents/{document_id}/post", tenant_body)
    assert status == 200 and posted["document"]["status"] == "POSTED", posted
    return document_id


def run():
    result = {
        "dsn_scope": "fixed disposable loopback Lab DB",
        "http_scope": "local TypeScript process on 127.0.0.1",
        "cases": [],
    }
    with connect() as connection:
        apply_schema(connection)
        seed(connection)

    environment = {**os.environ, "ERP_LAB_DSN": DSN, "ERP_LAB_PORT": str(PORT)}
    process = subprocess.Popen(
        ["pnpm", "exec", "tsx", "labs/erp-domain/ecount/backend/src/http-server.ts"],
        cwd=ROOT,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_for_health(process)
        material_receipt = {
            "tenantId": str(TENANT_A),
            "type": "receipt",
            "idempotencyKey": "http-material-receipt-2kg",
            "lines": [
                {
                    "productId": str(PRODUCT_MATERIAL),
                    "quantity": 2,
                    "unit": "kg",
                    "destinationLocationId": str(LOCATION_A),
                }
            ],
        }
        receipt_id = create_confirm_post(material_receipt)
        status, duplicate = request_json("POST", "/lab/erp/inventory-documents", material_receipt)
        assert status == 201 and duplicate["document"]["id"] == receipt_id, duplicate
        status, detail = request_json("GET", f"/lab/erp/inventory-documents/{receipt_id}?tenantId={TENANT_A}")
        assert status == 200, detail
        assert detail["document"]["status"] == "POSTED", detail
        assert detail["document"]["lines"][0]["quantity"] == "2000", detail
        assert detail["document"]["lines"][0]["input_quantity"] == "2", detail
        assert detail["document"]["lines"][0]["input_unit"] == "kg", detail
        assert detail["document"]["ledger"][0]["quantity_delta"] == "2000", detail
        result["cases"].append(
            {"name": "receipt_post_and_idempotency", "document_id": receipt_id, "input": "2 kg", "ledger_delta": "2000 g"}
        )

        status, invalid_input = request_json(
            "POST",
            "/lab/erp/inventory-documents",
            {"tenantId": str(TENANT_A), "type": "receipt", "idempotencyKey": "http-invalid-input", "lines": []},
        )
        assert status == 400 and invalid_input["code"] == "INVALID_DOCUMENT_INPUT", invalid_input
        result["cases"].append({"name": "workflow_validation_is_stable_http_error", "status": 400})

        invalid_unit = {
            "tenantId": str(TENANT_A),
            "type": "receipt",
            "idempotencyKey": "http-invalid-material-unit",
            "lines": [
                {
                    "productId": str(PRODUCT_MATERIAL),
                    "quantity": 1,
                    "unit": "EA",
                    "destinationLocationId": str(LOCATION_A),
                }
            ],
        }
        status, rejected = request_json("POST", "/lab/erp/inventory-documents", invalid_unit)
        assert status == 400 and rejected["code"] == "INVALID_DOCUMENT_UNIT", rejected
        assert rejected["details"] == {
            "code": "INVALID_DOCUMENT_UNIT",
            "lineIndex": 0,
            "allowedUnits": ["g", "kg"],
            "baseUnit": "g",
            "message": "material-001의 입력 단위를 g, kg 중 하나로 바꿔 주세요.",
        }, rejected
        retry = {**invalid_unit, "lines": [{**invalid_unit["lines"][0], "unit": "kg"}]}
        status, corrected = request_json("POST", "/lab/erp/inventory-documents", retry)
        assert status == 201, corrected
        result["cases"].append({"name": "invalid_unit_feedback_and_corrected_retry", "status": 400, "allowed_units": ["g", "kg"]})

        too_large_shipment = {
            "tenantId": str(TENANT_A),
            "type": "shipment",
            "idempotencyKey": "http-material-shipment-too-large",
            "lines": [{"productId": str(PRODUCT_MATERIAL), "quantity": 3000, "unit": "g", "sourceLocationId": str(LOCATION_A)}],
        }
        status, shipment = request_json("POST", "/lab/erp/inventory-documents", too_large_shipment)
        assert status == 201, shipment
        shipment_id = shipment["document"]["id"]
        status, confirmed = request_json("POST", f"/lab/erp/inventory-documents/{shipment_id}/confirm", {"tenantId": str(TENANT_A)})
        assert status == 200 and confirmed["document"]["status"] == "CONFIRMED", confirmed
        status, insufficient = request_json("POST", f"/lab/erp/inventory-documents/{shipment_id}/post", {"tenantId": str(TENANT_A)})
        assert status == 409 and insufficient["code"] == "INSUFFICIENT_STOCK", insufficient
        status, failed_detail = request_json("GET", f"/lab/erp/inventory-documents/{shipment_id}?tenantId={TENANT_A}")
        assert status == 200 and failed_detail["document"]["status"] == "CONFIRMED" and failed_detail["document"]["ledger"] == [], failed_detail
        result["cases"].append({"name": "insufficient_stock_no_ledger_write", "status": 409, "document_status": "CONFIRMED"})

        status, hidden = request_json("GET", f"/lab/erp/inventory-documents/{receipt_id}?tenantId={TENANT_B}")
        assert status == 404 and hidden["code"] == "DOCUMENT_NOT_FOUND", hidden
        result["cases"].append({"name": "tenant_scoped_document_read", "status": 404})

        package_receipt = {
            "tenantId": str(TENANT_A),
            "type": "receipt",
            "idempotencyKey": "http-package-receipt-2box",
            "lines": [{"productId": str(PRODUCT_PACKAGED), "quantity": 2, "unit": "BOX", "destinationLocationId": str(LOCATION_A)}],
        }
        package_id = create_confirm_post(package_receipt)
        status, reversal = request_json(
            "POST",
            f"/lab/erp/inventory-documents/{package_id}/reverse",
            {"tenantId": str(TENANT_A), "idempotencyKey": "http-package-receipt-reversal"},
        )
        assert status == 201 and reversal["document"]["status"] == "POSTED", reversal
        status, original = request_json("GET", f"/lab/erp/inventory-documents/{package_id}?tenantId={TENANT_A}")
        assert status == 200 and original["document"]["status"] == "REVERSED", original
        result["cases"].append({"name": "reversal_preserves_original_and_posts_counter_ledger", "document_id": package_id})

        with connect() as connection:
            mismatches = assert_reconciled(connection)
        result["reconciliation_mismatches"] = mismatches
        result["status"] = "passed"
        return result
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit(f"refusing to overwrite existing evidence: {args.output}")
    try:
        result = run()
    except (AssertionError, psycopg.Error, URLError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False, indent=2))
        raise
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
