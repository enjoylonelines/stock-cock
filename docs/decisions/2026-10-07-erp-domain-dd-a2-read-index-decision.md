# DD-A2 read index decision

Date: 2026-10-07  
Decision: adopt two PostgreSQL read indexes in the isolated ERP Domain Lab; do not add Redis or an aggregation table in this cycle.

## Evidence

The accepted synthetic workload result is `labs/erp-domain/ecount/evidence/2026-10-07-dd-a2-read-baseline-v2.json`.

- Recent ledger history changed from Bitmap Heap Scan + Sort to Index Scan and reduced p95 from 8.692ms to 1.162ms.
- Period movement reduced p95 from 12.166ms to 2.922ms.
- Location shortage changed from Seq Scan + Sort to Index Only Scan and reduced p95 from 1.292ms to 0.580ms.
- Current-stock lookup already used the primary-key index; a new cache would not address a measured bottleneck.

## Boundary

This decision applies only to the Lab's fixed 120,000-row, hot-SKU synthetic read fixture. It is not a production index recommendation, capacity claim, or authorization to introduce Redis. Revisit it only when a controlled workload measures read/write trade-offs, stale-data requirements, and cache invalidation policy.
