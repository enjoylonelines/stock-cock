# DB-authoritative inventory mutation boundary evidence

Date: 2026-09-24  
Repository / base commit: `/Users/hb/Projects/inventory/checkout` @ `7c0fe8484151e898721bad167fe90bdd6d873a2f`  
Status: root ledger invariant addressed in code/static contract; live DB verification pending.

## Supervisor finding and correction

The first cycle migration's `apply_inventory_delta` changed inventory without a
canonical `transactions` and `transaction_items` write. That violated the
representative ledger/current-stock invariant. It is superseded, not accepted
as a complete result.

`create_transaction(p_header jsonb, p_items jsonb)` was inspected before the
correction. Its current contract accepts only `in|out` and one `warehouse_id`,
so using it for one `move` header with both warehouses would misrepresent the
existing schema. The schema's existing `transactions_type_check` explicitly
allows `move`, and a canonical move stores both warehouse ids plus one item row
per option.

New migration `supabase/migrations/20260924011000_ledgered_inventory_moves.sql`:

1. revokes authenticated execution and drops the unledgered
   `apply_inventory_delta` function;
2. adds `create_inventory_move(p_header jsonb, p_items jsonb)`;
3. validates user, two distinct warehouses, item shape/uniqueness, product
   unit, and quantity using the canonical function's input conventions;
4. inserts `transactions(type='move', user_id, memo, created_at,
   from_warehouse_id, to_warehouse_id)`;
5. obtains ordered source/destination pair advisory locks, decrements source,
   increments/inserts destination, and inserts matching `transaction_items`;
6. raises an error for invalid/missing/insufficient/capacity state, so the SQL
   function transaction rolls back its header, item, and inventory writes
   together.

`/api/moves` now calls this one RPC once for all items; it no longer creates a
move header/items separately or invokes an inventory-only helper. The route
maps canonical insufficient/missing inventory results to HTTP 409.

## Absolute adjustment decision

Absolute adjustment remains a separately named expected-version audit contract.
Under the existing model it **does require** a reconciliation ledger entry:
`/api/adjustments` continues to create canonical `transactions(type='adjust')`
and `transaction_items` containing the observed adjustment delta, while the
DB adjustment RPC stores the absolute old/new audit record. Recalculation uses
the same named adjustment RPC and audit reason.

That adjustment header/item and absolute adjustment RPC are still separate DB
calls, so this cycle does not claim server-atomic adjustment-ledger coupling.
Whether to add a single server adjustment function is a later product boundary,
not an excuse to bypass the ledger.

## Static/contract revalidation

```sh
pnpm exec biome check src/utils/inventory.ts src/app/api/moves/route.ts src/app/api/adjustments/route.ts src/app/api/inventory/recalculate/route.ts src/__tests__/inventory.test.ts src/__tests__/inventory-mutation-migration.test.ts src/types/database.ts
pnpm exec jest --watchman=false --runInBand --runTestsByPath src/__tests__/inventory.test.ts src/__tests__/inventory-mutation-migration.test.ts
pnpm exec tsc --noEmit
git diff --check
```

- Biome: PASS, seven changed TypeScript files.
- Jest: PASS, two suites / eight tests. They assert a single `create_inventory_move`
  RPC payload with no table reads/writes, client input validation, 409
  insufficient-stock mapping, reason/version adjustment handling, 409 stale
  adjustment mapping, and migration source markers for ledger header/item plus
  source/destination deltas.
- TypeScript: PASS (exit 0, no output).
- `git diff --check`: PASS (exit 0, no output).

These are static/client contract tests. They do not establish SQL parse,
execution, rollback, lock ordering, or ledger reconciliation in PostgreSQL.

## Live environment and raw evidence

The existing isolated environment is still unavailable: `docker-compose` cannot
connect to `unix:///Users/hb/.colima/default/docker.sock`, and
`tests/inventory/.venv/bin/python` is absent. No container, venv, fixture,
migration application, production write, or external call was made. No new raw
DB evidence exists.

## Limits and stop condition

- The code now has one server transaction boundary for a move, but it has not
  been live-tested against current migrations, grants, RLS, or concurrent moves.
- Existing `create_transaction` behavior, response-loss/idempotency, retry,
  performance, and production behavior remain out of scope.
- Product provisioning and warehouse deletion remain documented direct-DML
  exceptions; global DML revocation/RLS redesign is not claimed.
- STOP condition met for this supervisor correction: one minimal ledger
  correction and one focused static revalidation. Do not make adjacent changes
  without a new decision.
