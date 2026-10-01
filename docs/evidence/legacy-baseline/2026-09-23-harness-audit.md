# 2026-09-23 baseline harness audit

Status: historical audit summary

## What the harness was useful for

The baseline harness was designed to create deterministic synthetic fixtures, run bounded concurrent RPC calls from independent database connections, and compare the committed ledger against final inventory using an oracle separate from the application helper.

It also recorded raw SQLSTATE/error information, connection/backend identifiers, basic lock/activity observations, and fixture/result snapshots.

That made it suitable for reproducing concrete correctness counterexamples in the pre-refactor write path.

## What it did not prove

The harness did not establish:

- production equivalence
- HTTP/PostgREST behavior
- Supabase authentication or RLS behavior
- connection-pool behavior
- production traffic distribution
- p95/TPS or saturation limits
- retry/idempotency behavior
- response-loss recovery
- every inventory writer path
- full migration/extension/cron parity

The minimal schema intentionally omitted unrelated application tables, policies, views, background jobs, and some indexes.

## Interpretation rules

- A committed transaction ledger must be reconciled against the final inventory state; API success alone is insufficient.
- A final quantity of zero can still be wrong when two outbound ledger entries committed from an initial quantity of one.
- Forced overlap / lock-gate runs are correctness probes, not natural contention frequency or latency measurements.
- Rollback of one intentionally failing batch does not imply all failure modes are safe.
- Historical observations explain the defect that motivated the refactor; they do not replace current post-refactor evidence.

## Current evidence superseding the baseline

For current claims, prefer the repository's later evidence:

- `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md`
- `tests/inventory/results/ledgered-move-live-20260924-v3.json`
- `tests/inventory/results/migration-verify-ledgered-live-20260924.json`
- `docs/evidence/2026-09-25-inventory-write-path-consolidation-slice.md`
