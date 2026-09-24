# Supervised cycle evidence: cross-writer stale absolute update interleaving

Date: 2026-09-24  
Repository / base commit: `/Users/hb/Projects/inventory/checkout` @
`7c0fe8484151e898721bad167fe90bdd6d873a2f`  
Status: **new bounded execution not run; STOP at Decision Gate**.

## Execution availability check

The planned target is the existing disposable loopback environment in
`tests/inventory/compose.yaml` (PostgreSQL on `127.0.0.1:55439`), not a
production system. Before any fixture write, these commands were attempted:

```sh
docker compose -f tests/inventory/compose.yaml ps
docker-compose -f tests/inventory/compose.yaml ps
tests/inventory/.venv/bin/python -c 'import psycopg; print(psycopg.__version__)'
```

Observed results:

- This host's `docker` does not provide the `compose` subcommand.
- `docker-compose` could not connect to
  `unix:///Users/hb/.colima/default/docker.sock` (`no such file or directory`).
- `tests/inventory/.venv/bin/python` does not exist.

The existing isolated DB and its required Python client are therefore
unavailable. No container was started, no package/venv was created, no fixture
was written, and no production or external system was contacted. In particular,
there is **no new** `pg_stat_activity`, `pg_locks`, MVCC-snapshot, final-row, or
ledger observation for this cycle.

## Inspected repository evidence

| Source | Verified fact | Evidence level |
| --- | --- | --- |
| `src/utils/inventory.ts` | `updateInventory` reads an inventory row, computes `newQty`/`newWeight` in application code, then sends an absolute `.update(...)` by row id. It has no visible `FOR UPDATE`, advisory-lock, version predicate, or retry. | Static source inspection; not a live interleaving. |
| `supabase/migrations/20260924000000_enforce_inventory_pair_policy.sql` | Current `create_transaction` takes a pair-derived `pg_advisory_xact_lock(...)` before its inventory `SELECT`, then uses `quantity = quantity + v_delta` (or equivalent grams) for an existing row. | Static source inspection; lock acquisition is visible, but grant/wait timing was not observed. |
| `tests/inventory/limits.py` | Existing `cross_writer_trial` deliberately schedules an ordinary read, a real RPC `+1`, then an absolute `old + 5` update and checks final 106. | Harness source inspection. |
| `docs/plans/STOCK_COCK_LIMITS_VALIDATION_PLAN.md` | The prior report says that schedule ended at 105 while expected was 106 and names `tests/inventory/results/limits-p1-v9.json`. | Prior report, not independently revalidated here. The named raw JSON is absent from the current checkout. |
| `tests/inventory/reference_harness.py` and `tests/inventory/compose.yaml` | The harness requests `READ COMMITTED`; the intended DB is a fixed synthetic loopback PostgreSQL container with test credentials. | Configuration inspection; not evidence that it is running now. |

`tests/inventory/results/limits-p1-v9.json` is not present in this checkout, so
the prior numerical counterexample cannot be upgraded to newly verified raw
evidence. The retained P1 JSON files concern first-inbound concurrency and do
not substitute for this cross-writer result.

## Evidence-backed interleaving model (not a new execution)

Given the inspected source and configured `READ COMMITTED` setting, the precise
counterexample the unavailable run was intended to observe is:

| Step | Session A: absolute writer | Session B: RPC writer | Boundary |
| --- | --- | --- | --- |
| 1 | `BEGIN`; ordinary `SELECT quantity` returns 100; compute 105 | — | A does not call `FOR UPDATE` or the pair advisory lock. |
| 2 | Paused by the deterministic test gate | Acquires the RPC pair advisory lock, executes its current-value `+1`, records the transaction item, and commits. | B's contract only serializes writers that use its lock/key; its delta expression prevents B from using A's stale application value. |
| 3 | Executes absolute `UPDATE ... SET quantity = 105`; commits | — | Under configured READ COMMITTED, this is a later statement boundary. The update has no version/expected-old-value predicate, so the inspected source supplies no conflict detection for B's committed change. |
| 4 | — | — | Final is 105 although committed deltas imply 106; the RPC ledger contains B's +1, while A's helper does not add that RPC ledger record. |

This is a source-derived explanation plus an unverified prior report; it is not
a claim that current `txid_current_snapshot()`, tuple locks, or wait events were
observed. The planned run would have captured an A snapshot before step 2 and a
new statement snapshot at step 3, and would have sampled B's blocking chain in
the two cooperating comparisons below.

## Lock and isolation boundaries to test when the existing environment returns

- **Ordinary read baseline:** the helper's plain select neither calls
  `FOR UPDATE` nor the RPC advisory key. It can therefore violate the RPC's
  participant-only advisory contract.
- **Row lock before read:** A would run `SELECT ... FOR UPDATE` before reading
  100. B's existing-row update should wait on A's row lock; after A writes 105
  and commits, B's current-value `+1` should complete at 106. This only helps
  writers that consistently lock before their reads and use compatible order.
- **Shared advisory lock before read:** A would take the exact pair-derived
  transaction advisory key before reading. B should wait at the same advisory
  lock; A writes 105 and commits, then B applies `+1` to reach 106. It only
  protects writers that derive and acquire the same key at the same boundary.
- **MVCC/isolation boundary:** `READ COMMITTED` must be measured with
  `txid_current_snapshot()` per statement in this test; this document does not
  substitute static configuration for that measurement. `REPEATABLE READ` and
  `SERIALIZABLE` behavior, including serialization failures/retry, are outside
  the authorized execution budget.

## Result, limitations, and budget

- **Result:** no new result; the six-fixture budget was consumed by zero DB
  fixtures because the required existing environment was unavailable. No
  reinforcement or revalidation was performed.
- **Raw evidence path:** none created. The relevant historical path referenced
  by a prior report is missing: `tests/inventory/results/limits-p1-v9.json`.
- **Limitations:** static code and a prior report do not prove current runtime
  scheduling, lock acquisition, PostgREST/API behavior, production RLS/session
  behavior, other writers, deadlocks, throughput, response-loss, idempotency,
  or retry safety. Synthetic/reference fixtures are not human gold.
- **STOP condition:** met by the availability boundary and no-new-infrastructure
  rule. Do not expand to response-loss/idempotency, scale tests, or global
  writer changes in this cycle.
