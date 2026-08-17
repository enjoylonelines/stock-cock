# Transaction Integrity Evidence

> Status: U3 evidence draft
> Scope: transaction integrity claims only
> Last reviewed: 2026-08-16

## Summary

Stock Cock currently has code and migration evidence that in/out stock transactions use the Supabase RPC `create_transaction(p_header, p_items)`. This is stronger than the older application-level sequential write description, but it is not the same as a fully verified production concurrency or rollback claim.

Move and adjustment RPC work exists in the current worktree, but it is still classified as work in progress until its migration signature, production application, and focused tests are verified.

## Claim Matrix

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| In/out API calls an RPC | `[code_verified]` | `src/app/api/transactions/route.ts` calls `supabase.rpc("create_transaction", ...)` | API behavior observed in code, not live write-tested in this pass. |
| `create_transaction` migration exists | `[code_verified]` | `20260131100000_remove_inventory_batches_and_add_create_transaction_rpc.sql`, `20260131110000_fix_create_transaction_rpc_signature.sql`, `20260131120000_drop_create_transaction_jsonb_array_overload.sql` | Migration files exist locally; remote applied state was not changed or directly verified. |
| In/out transaction is DB-function based | `[code_verified]` | RPC function inserts `transactions`, loops items, updates/inserts `inventory`, inserts `transaction_items` | PostgreSQL function execution should be atomic per call, but rollback behavior was not integration-tested here. |
| In/out RPC signature uses PostgREST-compatible JSON payload | `[code_verified]` | Current fixed function accepts `p_items jsonb` and uses `jsonb_array_elements(p_items)` | This fixes the earlier `jsonb[]` mismatch documented in README. |
| Move RPC exists | `[work_in_progress]` | Dirty route calls `create_move_transaction`; untracked migration defines it | Migration is not tracked and not applied in this pass. |
| Adjustment RPC exists | `[work_in_progress]` | Dirty route calls `create_adjustment_transaction`; untracked migration defines it | Migration is not tracked and not applied in this pass. |
| Move/adjustment RPC signatures are ready | `[work_in_progress]` | Migration currently defines `p_items jsonb[]` | This resembles the earlier in/out signature problem; verify or change only in a separate implementation pass. |
| Move/adjustment row locking | `[work_in_progress]` | WIP migration uses `FOR UPDATE` on selected inventory rows | No DB integration or concurrency test was run. |
| Negative stock prevention | `[unknown]` | Current utility tests allow negative inserts; RPCs also subtract without a guard | Needs business policy and DB/API tests. |
| Concurrent in/out protection | `[unknown]` | `create_transaction` selects inventory without `FOR UPDATE` | Needs DB integration/concurrency validation. |
| Recalculate history endpoint | `[work_in_progress]` | Dirty `src/app/api/inventory/recalculate/route.ts` exists | No focused test or live validation in this pass. |

## Current In/Out Flow

Current API path:

1. `src/app/api/transactions/route.ts` validates request items.
2. It builds `p_header` and `p_items`.
3. It calls `supabase.rpc("create_transaction", { p_header, p_items })`.
4. On success, it sends a non-blocking transaction notification.

Current RPC path:

1. `create_transaction(p_header jsonb, p_items jsonb)` inserts a row into `transactions`.
2. It loops over `jsonb_array_elements(p_items)`.
3. For each item, it selects the matching `inventory` row.
4. It updates or inserts `inventory` using `quantity` for finished goods and `weight_in_grams` for materials.
5. It inserts a `transaction_items` row.
6. It returns `{ transaction_id, success }`.

## Stale Documentation Fixed

| File | Previous statement | Updated statement |
|---|---|---|
| `README.md` | In/out was presented as a four-step application-level sequence using `inventory_batches`. | It now describes the current `create_transaction` RPC flow and its verification boundaries. |
| `docs/TECH_QA.md` | Q13 said Supabase client writes were sequential and rollback was absent. | Q13 now says the current implementation uses RPC, while rollback/concurrency/negative-stock claims still require integration validation. |

## Known Gaps

### Remote DB State

No migration was applied during this pass. The repository contains the relevant migration files, but production function definitions were not fetched or compared.

### Rollback

The current in/out RPC is a PostgreSQL function, so it is designed to run as one database call. This pass did not run a DB integration test that intentionally fails mid-function and verifies rollback.

### Concurrency

The current in/out RPC selects inventory with `LIMIT 1`, without `FOR UPDATE`. That means concurrent update protection should not be claimed yet. The WIP move/adjustment migration uses `FOR UPDATE`, but it is not verified.

### Negative Stock

Negative stock prevention should not be claimed. The current utility tests include a case where a missing inventory record can be created with a negative quantity, and the RPCs subtract quantities without an explicit non-negative guard.

### Move and Adjustment RPC

The WIP migration defines `p_items jsonb[]`. The in/out RPC previously had a production-facing mismatch with `jsonb[]` and was fixed to `jsonb`, so move/adjustment signatures need explicit verification before they are used as portfolio evidence.

## Safe Portfolio Claim

> The in/out transaction API was moved from application-level sequential writes to a Supabase RPC that records the transaction and updates inventory in one database function call. I document the remaining validation boundary separately: production migration state, rollback behavior, concurrent updates, and negative-stock policy still require dedicated DB integration tests.

## Unsafe Claims

- Do not say all transaction types are production-verified RPCs.
- Do not say concurrency is solved.
- Do not say negative stock is prevented.
- Do not say rollback was tested.
- Do not say move/adjustment RPCs are complete until the WIP migration and route changes are validated.

## Recommended Next Check

Before stronger claims, run a separate DB integration pass that verifies:

- production or local Supabase function signatures
- in/out rollback on intentional failure
- concurrent out requests against the same inventory row
- negative-stock policy for finished goods and materials
- move/adjustment RPC invocation with the actual PostgREST payload shape
- transaction history recalculation correctness after in/out/move/adjust records

