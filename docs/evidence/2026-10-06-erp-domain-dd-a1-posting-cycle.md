# ERP domain Deep Dive DD-A1 — 전표 확정 및 재고 반영 cycle

Date: 2026-10-06  
Repository / branch / baseline HEAD: `/Users/hb/Projects/inventory/checkout` / `main` / `c4ea725`  
Scope: isolated ECOUNT ERP Domain Lab only. The existing Stock-Cock service, its database, and its external integrations were not modified or exercised.

## Question and selected policy

Can a tenant-scoped receipt, shipment, partial return, adjustment,
multi-line warehouse-transfer, and reversal document be finalized so that
document status, stock ledger, and balance projection remain explainable under
duplicate delivery, failed transfer, row-level bulk receipt failure, same-key
concurrent shipment, and concurrent reversal/shipment?

The policies were approved before this run:

- `DRAFT → CONFIRMED → POSTED → REVERSED`; `CONFIRMED`는 전표 확정 및 재고
  반영과 구분된다.
- Every product rejects a negative posted balance.
- A warehouse transfer is all-or-nothing.
- The same tenant-bound idempotency key returns the first document rather than creating another one.
- A reversal preserves the original document, records compensating ledger rows
  in a separate document, and permits only one reversal per source document.
- A partial return references a posted shipment line and cannot exceed the
  source quantity; a created return prevents full reversal of that shipment.
- A bulk receipt returns one result per row; an invalid row does not roll back
  a valid independent row.
- Finished goods use `EA` as their base unit. A packaged finished good accepts
  `BOX = 24 EA`. Material uses `g`, accepts `kg`, and stores the normalized `g`
  quantity in the ledger and balance projection.

## Implementation boundary

- Schema: `labs/erp-domain/ecount/sql/001_inventory_document_schema.sql`
- Posting functions and reconciliation view: `labs/erp-domain/ecount/sql/002_inventory_document_posting.sql`
- Disposable database topology: `labs/erp-domain/ecount/compose.yaml`
- Integration fixture/harness: `labs/erp-domain/ecount/test/posting_integration.py`

`post_confirmed_document` is the technical implementation of 전표 확정 및 재고 반영:
it locks the document, acquires every tenant/product/location balance key in a
single sorted order, applies balance deltas, appends ledger rows, then changes
the document to `POSTED` in the same transaction. A conditional balance update
rejects an insufficient existing balance; a new balance row can only start
non-negative.

## Accepted run

Method: PostgreSQL 16 disposable container on loopback `127.0.0.1:55441`; the harness first drops and recreates only the `erp_lab` schema, then seeds two tenants and fixed UUID fixtures.

Raw result: `labs/erp-domain/ecount/evidence/2026-10-07-posting-v9-package-normalization.json`

| Case | Observed result |
| --- | --- |
| Receipt of 10 | Posted; balance became 10. |
| Duplicate receipt key | Returned the original document; document count stayed 1. |
| Shipment of 4 | Posted; balance became 6. |
| Transfer of 7 from balance 6 | Rejected with `P0001`; source remained 6 and destination remained 0. |
| Tenant partition | Tenant A stayed 6 while tenant B independently received 5. |
| Material unit normalization | `2 kg` receipt recorded `2000 g`; a `500 g` shipment left `1500 g`; unsupported `EA` was rejected. |
| Finished-good package normalization | `2 BOX` receipt recorded `48 EA`; a `12 EA` shipment left `36 EA`; unsupported `kg` was rejected. |
| Partial return | A return of 2 against a shipment of 4 posted; a further return of 3 was rejected; resulting balance was 8. |
| Adjustments | One adjustment-out of 1 and adjustment-in of 3 restored the fixture balance to 10. |
| Multi-line transfer | Two lines posted atomically (source 6, destination 4); a later multi-line transfer with one insufficient line rolled back both legs. |
| Bulk receipt row policy | One valid row posted and one invalid cross-tenant product row returned `REJECTED 22023`; the valid row remained applied. |
| Reversal and shipment concurrently | The original shipment became `REVERSED`; its reversal and a shipment of 6 both posted; resulting balance was 4. |
| Duplicate/second reversal | The identical reversal key returned the existing reversal; a distinct second reversal was rejected. |
| Two concurrent shipments of 3 from balance 4 | One `POSTED`; one `P0001 INSUFFICIENT_STOCK`; final tenant-A balance 1. |
| Reconciliation | 0 ledger/balance mismatches. |

The concurrency case intentionally delays each worker after it has acquired the test balance lock. This demonstrates overlap in this disposable fixture; elapsed times are diagnostic only and are not performance claims.

## Interpretation

고정된 입고·출고·반품·조정·다중 항목 이동·역분개 fixture에서 승인된 예측은
유지됐다. 실행 결과는 음수 재고, 중복 입고 전표, 한쪽만 반영된 실패 이동, 과다
반품, 중복 역분개, 최종 원장/현재고 불일치를 만들지 않았다. 역분개는 원 전표를
수정하지 않고 별도 전표와 반대 방향 원장 항목으로 기록됐고, 반품은 원 출고 항목을
참조했다. 원재료는 입력 단위와 기준 단위를 분리해 원장·현재고에는 `g`로만
누적됐고, 포장 완제품은 `BOX` 입력을 `EA`로 정규화했다. 이는 Lab의 전표 확정 및
재고 반영 경계에 대한 증거이며, 기존 Stock-Cock 스키마나 운영 환경의 정합성을
뜻하지 않는다.

## Limits and next falsifiers

- The harness has no HTTP/API authorization, RLS, external ERP API, outbox/retry, crash/restart recovery, or global-writer proof.
- It uses fixed, small synthetic fixtures. It does not prove multi-document deadlock freedom, latency, throughput, lock-wait, or customer-scale behavior.
- Partial reversal, return-to-vendor, cost accounting, closing periods, and every external-interface policy are outside this Cycle.
- Packaging, yield, BOM consumption, lot, density conversion, and unit-history policy are outside this Cycle.
- The DD-A1 stop condition is satisfied only for the selected quantity domain and fixtures. DD-A2 should begin with a measured workload baseline rather than treating this correctness harness as a performance result.
