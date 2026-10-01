# September inventory refactor traceability

This document connects the September baseline failures to the implemented changes now present on `inventory-consistency-reinforcement`.

| Historical finding | Implemented change | Commit / evidence |
| --- | --- | --- |
| concurrent requests could overwrite a committed inventory change | moved inventory mutation toward DB-authoritative atomic delta semantics and coordinated same-pair writers | `b763496`, `b47d798` |
| first inbound could race while creating the inventory row | enforced a single inventory-row policy for concurrent first inbound | `b47d798` |
| API-level success/error did not by itself prove inventory correctness | added explicit inventory/API regression and migration tests | `c66ec79`, `009ef9d`, `6566515` |
| a safe RPC can still be undermined by other absolute writers | documented and tested cross-writer limits; avoided claiming global safety | `c440643`, `6566515`, `docs/evidence/2026-09-24-supervised-cycle.md` |
| inventory move previously had split/implicit mutation semantics | introduced canonical ledgered `create_inventory_move` transaction boundary | `096e9e8` |
| move safety required live DB verification | validated bounded concurrent move, insufficient-stock rejection, and rollback behavior in PostgreSQL | `e9ef299`, `tests/inventory/results/ledgered-move-live-20260924-v3.json` |
| route-to-writer orchestration remained implicit | added `InventoryMoveApplicationService` and a single injected write contract while preserving the existing DB RPC transaction boundary | `802af1a`, `docs/evidence/2026-09-25-inventory-write-path-consolidation-slice.md` |

## Current architecture boundary

```text
Client
  -> Next.js inventory route
  -> InventoryMoveApplicationService
  -> single InventoryMoveWriteContract
  -> ledgered PostgreSQL RPC
  -> transaction + transaction_items + inventory mutation
```

The database remains the authoritative transaction boundary for the move itself. The application service names the orchestration boundary and prevents the route from accumulating independent write steps.

## Remaining limits

The September work does not establish:

- server-atomic coupling for every adjustment/audit path
- authenticated-principal derivation from the request boundary
- response-loss idempotency
- global revocation of direct inventory DML
- production-scale throughput or saturation
- HTTP/RLS end-to-end guarantees

Those remain separate engineering decisions rather than hidden assumptions.
