# DB-authoritative inventory mutation boundary

Date: 2026-09-24  
Repository: `/Users/hb/Projects/inventory/checkout`

## Problem framing

- **Observed problem:** `src/utils/inventory.ts` implements operational movement
  as application-side read → calculate → absolute `inventory.update`. The move
  route calls it for both warehouses. `setInventory` and the recalculate route
  are separately named/unnamed absolute writers without an expected-version
  predicate. They can bypass the current `create_transaction` delta boundary.
- **Human hypothesis:** `unrecorded`.
- **Human prediction:** `unrecorded`.
- **Human direction:** DB-authoritative mutation boundary selected for this
  implementation cycle. Final interpretation/adoption remains pending human
  decision.
- **AI prediction:** Moving the arithmetic and state predicate into one SQL
  delta function removes the client read-compute-absolute path for movement.
  A distinct absolute-adjustment function that requires nonblank reason and
  expected version can reject a stale correction rather than overwrite it.
- **Falsification condition:** Static/contract tests show a movement path still
  reads then absolutely updates inventory; either RPC lacks a current-value
  delta/predicate; or absolute adjustment accepts missing reason/version or has
  no deterministic conflict result.
- **Experiment budget / STOP:** One implementation plus one same-fixture
  revalidation. If the existing isolated DB remains unavailable, run only
  meaningful static/contract/unit checks. No live MVCC claim, no retry or
  response-loss work, no new infrastructure, and no second reinforcement.
- **Decision required:** After evidence, a human must decide whether the
  remaining recalculate/product-seed/delete writers should be migrated to the
  adjustment contract and what audit retention/authorization policy applies.
- **Unknowns:** Live PostgreSQL behavior, RLS grants, existing production data,
  multi-row move atomicity, ledger/audit retention model, retry/idempotency,
  response-loss, and operational performance.

## Alternatives and invariant

| Alternative | Treatment | Boundary |
| --- | --- | --- |
| Keep helpers | Client calculates absolute values | Rejected by selected direction: stale movement overwrite remains possible. |
| Delta RPC (implemented) | Server performs current-value delta and rejects invalid/missing outbound state | Movement arithmetic is DB-authoritative per inventory pair; two-leg move atomicity is not claimed. |
| Absolute adjustment RPC (implemented) | Server requires target value, nonblank reason, and expected row version | Intentional correction is explicit and rejects version mismatch. |
| Serializable/retry | Broader transaction isolation plus retry policy | Not implemented; retry/idempotency is out of scope. |

- **Invariant:** Movement callsites do not select inventory to calculate a new
  absolute quantity/weight and do not call table `.update`. Every successful
  delta function call changes the stored current value by its supplied delta;
  absolute correction requires both a reason and matching expected version.

## Discriminating implementation and revalidation

- Add one migration with an inventory row version and two server-owned RPCs.
- Change `updateInventory` to invoke only the delta RPC; retain a separately
  named `setInventory` only as the adjustment RPC facade requiring reason and
  expected version.
- Update the move route to pass deltas; do not change its larger transaction
  workflow. Update adjustment route to provide a human-readable reason and the
  version it just read. Treat recalculate as an unresolved separately named
  absolute writer unless the smallest safe change can route it through the same
  contract without changing its product policy.
- Add static/contract tests for no client movement table update, RPC payloads,
  reason/version validation, and conflict mapping. Run focused unit checks and
  type checking; run isolated DB integration only if its existing environment is
  available.

## Outcome

- Evidence: focused static/contract checks passed; live DB unavailable and therefore MVCC/RPC verification remains pending: `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md`.
- Decision: `docs/decisions/2026-09-24-db-authoritative-inventory-boundary.md`.
- Human interpretation and Changed belief: pending human decision.

## Supervisor correction: ledger invariant

The first implementation introduced `apply_inventory_delta` without writing the
canonical `transactions` and `transaction_items` ledger. That violates the
representative ledger/current-stock invariant and is not complete. The current
bounded correction is to fail closed on that unledgered path and add one
server-owned move function that atomically creates an existing-schema `move`
transaction, its items, and both inventory legs. `create_transaction` cannot
be reused because its current validated type contract is only `in|out` and has
one warehouse input. Absolute adjustment remains an audit contract; its
existing route-level transaction/item reconciliation entry is retained, while
server-atomic adjustment-ledger coupling remains a separately documented
decision.
