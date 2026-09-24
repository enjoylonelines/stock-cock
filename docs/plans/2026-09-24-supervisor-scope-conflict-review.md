# Supervisor scope-conflict review

Date: 2026-09-24  
Repository: `/Users/hb/Projects/inventory/checkout`  
Observed branch / HEAD: `inventory-consistency-reinforcement` / `7c0fe8484151e898721bad167fe90bdd6d873a2f`

## Checkpoint

- Diff summary: six modified TypeScript files; migrations, a migration contract test, and plans/decisions/evidence are untracked. Nothing is staged. This branch has no upstream tracking branch.
- Tests run in this review: none. Existing evidence records static/client-contract checks; no live PostgreSQL run is claimed.
- Experiment / result: the working slice moves operational movement to one ledgered server RPC and uses reason plus expected-version for absolute adjustment. Static checks passed in the recorded evidence; current migrations, RLS, lock ordering, rollback, and concurrent move behavior remain unverified.
- Evidence: `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md` and `docs/evidence/2026-09-24-supervised-cycle.md`.

## Alignment and conflicts

- Aligned: Kafka, Redis distributed locks, Kubernetes, and broad rewrites remain excluded. The central story remains PostgreSQL concurrency and writer contracts.
- Aligned: the current evidence does not claim production scale, TPS, p95, global writer consistency, retries, or idempotency.
- Tension: scope-depth review allowed documentation of the cross-writer interleaving as the next one task, whereas the current dirty slice also contains a DB-authoritative mutation implementation. It remains relevant to the representative problem, but it consumes a different implementation budget and must not be represented as a completed live concurrency reinforcement.
- Tension: the move mutation is server-atomic in the proposed migration, while adjustment ledger and versioned absolute update still use separate calls. This is an explicit unfinished transaction boundary, not a uniform global writer contract.
- Missing from the pasted operating-depth target: a versioned migration/rollback compatibility scenario and a response-loss retry experiment have not been planned as bounded, runnable experiments. They should not be started automatically.

## Unresolved question and decision required

The user owns whether an authorized isolated PostgreSQL run should validate the current move RPC before any other reinforcement. After that evidence, decide separately whether server-atomic adjustment ledger coupling is required and whether a response-loss/idempotency experiment is justified.

## Stop condition

No migration was applied, no DB was started, no test was rerun, and no Career OS update was performed. Stop at this supervisor checkpoint.
