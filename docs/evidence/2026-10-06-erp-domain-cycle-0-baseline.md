# ERP domain Deep Dive(심화 검토) Cycle 0 baseline(기준선)

Date: 2026-10-06  
Repository / branch / HEAD: `/Users/hb/Projects/inventory/checkout` / `main` / `29e35b8`  
Method: source inspection(소스 검사) only. No production(운영) request, database(데이터베이스) mutation, load test(부하 시험), or migration(마이그레이션) was run for this Cycle.

## Scope

This document maps the present Stock-Cock write paths before a separate ERP Domain Lab is implemented. It does not reinterpret prior isolated PostgreSQL evidence as a live current-system result, and it does not change the existing user-facing application.

The Lab starts from the same inventory problem, but it is a separate artifact. Its future `tenantId`, document status, location, idempotency, and reconciliation model are not claimed to exist in the current Stock-Cock schema.

## Current write-path map

| Entry point | Current write boundary | Static observation | Cycle 0 boundary |
| --- | --- | --- | --- |
| `POST /api/transactions` | `create_transaction(p_header, p_items)` RPC | Route validates in/out input and invokes one PostgreSQL RPC. | Source mapping only; current applied DB state and HTTP behavior were not rerun. |
| `POST /api/moves` | `InventoryMoveApplicationService` → `create_inventory_move(p_header, p_items)` RPC | The RPC creates one move header, inventory legs, and items in its server transaction. | This is the closest existing movement seam, not the new ERP Lab model. |
| `POST /api/adjustments` | Direct `transactions` insert → `apply_inventory_adjustment` RPC per item → direct `transaction_items` insert | Header, absolute adjustment/audit, and item writes cross more than one call. | Atomic coupling of adjustment header/items/audit remains outside this Cycle. |
| `POST /api/inventory/recalculate` | History read → `apply_inventory_adjustment` RPC per inventory pair | It performs explicit absolute corrections from application-side reconstruction. | It is not a proof that historical reconstruction is an ERP posting engine. |
| Product creation | Direct `inventory` insert after product/option creation | Provisioning can create an initial inventory row outside movement RPCs. | Provisioning/direct-DML exceptions remain a policy question. |
| Warehouse deletion / pruning | Direct deletes of transaction and inventory records | Administrative cleanup has separate write paths. | Retention and destructive-operation policy are excluded from this Lab. |

### Confirmed source references

- `src/app/api/transactions/route.ts` maps validated in/out requests to `create_transaction`.
- `src/app/api/moves/route.ts`, `src/lib/inventory/move-application-service.ts`, and `src/utils/inventory.ts` route moves through one named application contract and `create_inventory_move`.
- `supabase/migrations/20260924011000_ledgered_inventory_moves.sql` describes move header, source decrement, target increment, and items in one function transaction.
- `src/app/api/adjustments/route.ts` intentionally shows the unresolved multi-call adjustment composition.
- `src/app/api/inventory/recalculate/route.ts` and `src/services/product-api.ts` identify additional absolute/provisioning writers.

## Lab fixture(고정 입력) proposal

The fixture is intentionally small and deterministic. It must be created inside `labs/erp-domain/`; it will not seed or alter Stock-Cock's existing tables.

| Entity | Fixture values | Purpose |
| --- | --- | --- |
| Tenant | `tenant-a`, `tenant-b` | Verify every lookup, uniqueness rule, and reconciliation query is tenant-scoped. |
| Product / SKU | `sku-finished-001`, `sku-material-001` | Cover a count-based product and a gram-based material without mixing units. |
| Warehouse / location | `warehouse-a/receiving`, `warehouse-b/picking` | Exercise receipt, shipment, and two-legged movement. |
| Opening state | One `POSTED` receipt in `tenant-a` | Gives deterministic inventory for concurrent shipment and reversal cases. |
| Cross-tenant control | Same SKU label in `tenant-b` with an independent receipt | Detects accidental cross-tenant lookup or aggregation. |
| Request identity | Stable `businessTransactionId` / idempotency key per command | Makes duplicate-delivery results observable. |

This fixture is a proposal, not an adopted customer policy. Exact quantities, source documents, authorization roles, and material-unit rules remain to be selected before DD-A1 implementation.

## Lab invariants(불변식) to test

1. Only a `POSTED` document changes the ledger and `InventoryBalance` projection.
2. Per tenant, SKU, warehouse, and location, the sum of posted ledger entries equals the projected balance.
3. A shipment cannot commit a negative balance.
4. The same idempotency key returns the original completed result and creates at most one posted document.
5. A warehouse movement posts both legs or neither leg.
6. A reversal preserves the original posted document, references it, and posts compensating ledger entries instead of mutating history.
7. A tenant cannot read or mutate another tenant's document, ledger, or balance.

## Human-owned fields and Decision Gate

| Field | Current state | Required before DD-A1 closes |
| --- | --- | --- |
| Human hypothesis | approved 2026-10-06 | A DB transaction that posts document, ledger, and current-balance projection together, with tenant-bound idempotency, prevents unexplained divergence for the selected cases. |
| Prediction | approved 2026-10-06 | Same-SKU concurrent shipment, duplicate delivery, and failed movement leave no negative balance, duplicate posted document, or one-sided movement; posted-ledger sum and balance reconcile. |
| Falsification condition | proposed | Any invariant violation, cross-tenant row, duplicate posted document, or one-sided movement fails the selected design. |
| Posting policy | decided 2026-10-06 | Keep `DRAFT → CONFIRMED → POSTED → REVERSED`; `CONFIRMED` remains a distinct approval state before posting. |
| Batch policy | decided 2026-10-06 | Warehouse movement is all-or-nothing; bulk receipt may return independent per-row success/failure. |
| Negative-stock policy | decided 2026-10-06 | Every product type rejects a negative posted balance. |

## Stop condition

Cycle 0 source mapping, isolated fixture proposal, policy choices, human hypothesis, and prediction are complete. DD-A1 may now implement and interpret its isolated schema and fixtures. The first accepted result still requires the stated falsification conditions and post-run reconciliation.
