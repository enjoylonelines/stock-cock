# Supervised cycle: cross-writer stale absolute update interleaving

Date: 2026-09-24  
Repository: `/Users/hb/Projects/inventory/checkout`  
Scope: one existing-row, one SKU/warehouse pair, two PostgreSQL sessions in the
already configured loopback disposable test DB. No product SQL, migration, API,
or infrastructure change is authorized.

## Problem framing

- **Problem:** The existing `create_transaction` RPC updates an existing row with
  a delta, but a separate writer can read a quantity and later write a computed
  absolute value. The existing evidence records the resulting 105 vs expected
  106 counterexample, but does not yet show the two-session statement snapshots
  and lock acquisition boundary that makes the overwrite possible.
- **Human hypothesis:** `unrecorded`.
- **Human Prediction:** `unrecorded`.
- **AI prediction:** Under PostgreSQL `READ COMMITTED`, session A's ordinary
  `SELECT` takes no tuple lock and its later absolute `UPDATE` uses a new
  statement snapshot. If RPC session B commits `quantity = quantity + 1` between
  them, A can still write its old computed `105`; final quantity becomes 105
  while the RPC ledger has +1. If A takes `FOR UPDATE` before reading, or if A
  and B both take the same transaction advisory lock before reading, B waits and
  the serialized schedule ends at 106.
- **Falsification condition:** Any successful ordinary-read schedule ends at
  106, or an expected waiting session does not show a blocking lock chain before
  release, or a locking schedule ends other than 106. Such a result falsifies
  the corresponding explanation and is recorded without policy adoption.
- **Experiment budget:** One deterministic baseline and two locking comparators
  (row lock before read; shared transaction advisory lock before read), then one
  identical-fixture revalidation of each: six fresh UUID fixtures total; fixed
  loopback DB only; no retries, scale/load measurement, response-loss follow-on,
  production write, or code/migration reinforcement.
- **STOP / Decision required:** Stop after the six scheduled fixtures and raw
  lock/snapshot observations. A human must decide whether all writers should
  share a writer contract (delta, row lock, advisory lock, optimistic version,
  or higher isolation/retry); this cycle does not choose or implement it.
- **Unknowns:** Actual production connection/session behavior, RLS and HTTP
  paths, all non-RPC writers, contention/throughput, deadlock ordering across
  multiple rows, and retry/idempotency behavior are not measured.

## Alternatives and invariant

| Option | Read/write contract | Expected property / cost |
| --- | --- | --- |
| Existing delta RPC plus unrelated absolute writer (baseline) | A ordinary reads then writes an absolute value; B uses delta RPC | Counterexample remains possible because A does not participate in B's lock contract. |
| Delta update | Every writer changes `quantity = quantity + delta` in one write | Avoids stale application-side absolute write for this arithmetic; requires all writers to adopt it and separately define business predicates. |
| Row lock before read | Every read-compute-write writer locks the target row with `FOR UPDATE` before reading | Serializes cooperating writers; holds a row lock for transaction duration and needs consistent multi-row order. |
| Shared advisory lock before read | Every relevant writer takes the same pair-derived transaction advisory key | Can serialize a missing-row decision or a broader writer contract; it protects only participants and has key/order design obligations. |
| Optimistic version check | Absolute write carries a version predicate and retries/rejects on zero rows | Detects rather than serializes a race; retry and user-visible conflict semantics require policy. |
| Serializable isolation with retry | Transaction executes at `SERIALIZABLE`; serialization failures retry only under an explicit safe policy | PostgreSQL may abort a transaction rather than silently accept the anomaly; retry, side effects, and idempotency are outside this cycle. |

- **Invariant:** For a committed initial 100, an RPC ledger delta +1, and a
  cooperating writer delta +5, a serialized schedule must finish at 106 and
  `final quantity = initial + committed deltas`. The baseline intentionally
  demonstrates that the invariant is not global when the absolute writer is
  non-cooperating.

## Discriminating experiment

- **Fixture/workload:** Fresh UUID-based existing inventory row at 100 per run;
  session A begins `READ COMMITTED`, then reads, B invokes the current real
  `public.create_transaction` function for `in +1`, and A writes its computed
  +5. Thread events make the order deterministic. For comparators A acquires
  its declared lock before its read; B starts before A releases it. The observer
  records `pg_stat_activity`, `pg_locks`, `pg_blocking_pids`, transaction IDs,
  and `txid_current_snapshot()` at statement boundaries.
- **Metrics:** Final row quantity, committed RPC ledger delta, session states,
  lock mode/grant/blocking chain, A's pre/post statement snapshot strings, and
  whether B was observed waiting before release.
- **Adoption/rejection gate:** Evidence may explain the current boundary only.
  No option is adopted or rejected as product policy in this cycle; a failed
  expected result is evidence for human review, not authorization for another
  experiment.

## Outcome

- **Evidence:** execution environment unavailable; no new fixture/run;
  `docs/evidence/2026-09-24-supervised-cycle.md`.
- **Decision record:** `docs/decisions/2026-09-24-supervised-cycle.md`.
- **Human decision:** pending human decision.
- **Changed belief:** pending human decision.
