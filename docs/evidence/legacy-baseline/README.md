# Legacy baseline evidence index

Date organized: 2026-09-30  
Historical experiment date: 2026-09-23  
Repository: stock-cock  
Purpose: preserve the problem evidence that motivated the September inventory consistency refactor without treating historical experiments as current production guarantees.

## What this folder contains

- `2026-09-23-concurrency-baseline.md`: bounded baseline findings from the pre-refactor inventory RPC.
- `2026-09-23-harness-audit.md`: what the historical harness did and did not prove.
- `2026-09-refactor-traceability.md`: mapping from observed failures to the later September code changes and current evidence.

## Raw artifact location

The original experiment runner, synthetic schema, review notes, and raw JSON remain outside the Git repository under:

- `~/Projects/inventory/experiment/`
- `~/Projects/inventory/review/`
- `~/Projects/inventory/BASELINE_EXPERIMENT_REPORT.md`

Those files are historical research artifacts, not runtime dependencies. They are intentionally not duplicated into this repository because the current branch already contains newer in-repo validation artifacts for the implemented fixes.

## Evidence-use rule

Use this folder to explain **why the refactor was needed**.

Use current in-repo evidence to claim **what the refactored code actually guarantees in the tested scope**:

- `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md`
- `tests/inventory/results/ledgered-move-live-20260924-v3.json`
- `tests/inventory/results/migration-verify-ledgered-live-20260924.json`
- `docs/evidence/2026-09-25-inventory-write-path-consolidation-slice.md`

Do not use historical baseline measurements as current throughput, production-scale, HTTP/RLS, retry/idempotency, or global-writer guarantees.
