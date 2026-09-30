# 2026-09-23 inventory concurrency baseline

Status: historical baseline, pre-refactor  
Base revision: `239eb461611729f34ebb9ae345b5054e0d3e0255`

## Question

When two requests mutate the same existing SKU/warehouse inventory row, do the committed transaction ledger and the final inventory remain consistent, and is insufficient stock rejected?

## Environment

- PostgreSQL 17.11
- READ COMMITTED
- disposable loopback test DB
- direct SQL RPC calls using synthetic fixtures
- no production credentials or data
- no HTTP/PostgREST/RLS/session-path claim
- no retries
- minimal substitute schema, not full production equivalence

## Observed failures

The historical baseline reproduced correctness failures in the then-current `create_transaction` path.

### Concurrent inbound lost update

With an initial quantity of 100 and two committed inbound requests of +10 and +20, controlled-overlap runs produced final values below the ledger-derived 130 target.

Representative observed cases:

- count unit: final 110 while both transaction records committed
- gram unit: final 120g while both transaction records committed

The source path performed a read, calculated an absolute next value in application/RPC state, and later wrote that value. Two requests could therefore act on the same earlier value and overwrite a committed change.

### Insufficient-stock violation

With initial quantity 1 and two concurrent -1 outbound requests, multiple runs allowed both requests to commit.

Observed outcomes included:

- final 0 while two committed -1 ledger operations implied -1
- final -1, showing insufficient-stock/negative-inventory protection was absent

A zero final balance was therefore not sufficient evidence of correctness: it could still disagree with the committed ledger.

### Rollback control

A 10-item request with an intentional foreign-key failure rolled back its failed batch in the bounded control case. This showed one RPC transaction rollback case worked, but it did not prove concurrency safety.

## Root cause established by source + experiment

The pre-refactor path had no consistent pre-read row/advisory locking contract and no database-side insufficient-stock conditional update. Its read -> calculate -> absolute update sequence admitted stale writes.

The experiment did not justify Redis, Kafka, queues, or a service split. The directly observed problem was database write semantics and writer coordination.

## Stop condition

The baseline stopped after correctness failures were reproduced. It was not expanded into stress testing or production throughput benchmarking.

## Historical raw evidence

Original raw files remain under `~/Projects/inventory/experiment/results/`, including the C0/C1/C2/C4 runs. These historical files are not copied into Git and should not be cited as current post-refactor guarantees.
