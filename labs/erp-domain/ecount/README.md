# ECOUNT ERP Domain Lab

This directory is isolated from the existing Stock-Cock application. It explores
the smallest ERP inventory workflow: receipt, shipment, and transfer documents
move from `DRAFT` to `CONFIRMED` to `POSTED`; returns preserve their shipment
line reference and a later reversal preserves history.

## Current slice

- TypeScript keeps command validation and the workflow boundary explicit.
- PostgreSQL schema defines tenant-scoped documents, lines, ledger entries, and
  current balances.
- PostgreSQL의 전표 확정 및 재고 반영은 `CONFIRMED` 문서만 받아 문서 상태,
  원장 항목, 현재고 projection을 하나의 transaction으로 기록한다.
- A disposable-DB integration harness covers duplicate receipt, negative-stock
  rejection, failed transfer rollback, tenant partitioning, reversal history,
  concurrent reversal/shipment, concurrent shipment, partial return limits,
  adjustments, multi-line transfer rollback, bulk-receipt row results, and
  ledger/balance reconciliation.

## Reproduce the bounded integration proof

Start the disposable PostgreSQL container with `docker-compose -f compose.yaml
up -d`. From the repository root, install `test/requirements.txt` in an
isolated virtual environment, then run:

```bash
python labs/erp-domain/ecount/test/posting_integration.py \
  --output labs/erp-domain/ecount/evidence/<new-result>.json
```

The harness refuses to overwrite an evidence file. Its checked result is
`evidence/2026-10-06-posting-v7-cycle-1-lock-order.json`.

## DD-A2 read workload

`test/query_benchmark.py` rebuilds the disposable schema, seeds the fixed
synthetic read fixture, measures baseline queries, applies
`sql/003_query_indexes.sql`, and measures the same queries again. Its accepted
result is `evidence/2026-10-07-dd-a2-read-baseline-v2.json`.

The fixture is deliberately synthetic and read-only after seeding. It supports
an index decision for this Lab; it is not a production capacity, cache, or
customer-data claim.

## Boundary

This is an isolated PostgreSQL Lab, not a migration or runtime path for the
existing Stock-Cock service. It proves only the fixed fixtures and policies in
the linked evidence: it does not establish production authorization, API/RLS
isolation, crash recovery, partial reversal, cost accounting, closing periods,
or performance at customer scale. Its DD-A2 result also does not establish
write-index trade-offs, multi-client throughput, or a Redis stale-data policy.
