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
- 완제품은 `EA`, 포장 완제품은 `BOX = 24 EA`, 원재료는 `g`를 기준 단위로
  삼는다. `BOX`·`kg` 입력은 전표 행에 보존하면서 원장·현재고에는 각각 `EA`·`g`로
  정규화한다.
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
`evidence/2026-10-07-posting-v9-package-normalization.json`.

## TypeScript HTTP vertical slice

`backend/src/http-server.ts` exposes the Lab-only document workflow at
`POST /lab/erp/inventory-documents`, `POST .../:id/confirm`, `POST .../:id/post`,
`POST .../:id/reverse`, and `GET .../:id?tenantId=...`. Run it with
`ERP_LAB_DSN=... pnpm lab:erp:http`.

`test/http_integration.py` rebuilds the same disposable DB and starts that
TypeScript process. It proves the HTTP path for the posting state transition,
idempotency, unit-feedback response, insufficient-stock rejection without a
ledger write, tenant-scoped read, reversal, and final ledger/balance
reconciliation. Its checked result is
`evidence/2026-10-07-http-vertical-slice-v1.json`.

## DD-A2 read workload

`test/query_benchmark.py` rebuilds the disposable schema, seeds the fixed
synthetic read fixture, measures baseline queries, applies
`sql/003_query_indexes.sql`, and measures the same queries again. Its accepted
result is `evidence/2026-10-07-dd-a2-read-baseline-v2.json`.

The fixture is deliberately synthetic and read-only after seeding. It supports
an index decision for this Lab; it is not a production capacity, cache, or
customer-data claim.

## Capacity-boundary workload

`test/capacity_benchmark.py` measures the existing bulk-receipt SQL path and
the separate local TypeScript HTTP read/write/mixed paths. It rebuilds a
synthetic 1,000-product fixture, samples PostgreSQL activity, verifies
ledger/balance reconciliation, and refuses to overwrite evidence. A direct
bulk result is explicitly not an HTTP capacity result.

For a smoke run after starting the disposable database:

```bash
pnpm lab:erp:capacity --profile import --rows 1000 --chunk-size 100 \
  --output labs/erp-domain/ecount/evidence/<new-result>.json
```

For a repeated ladder, `lab:erp:capacity-ladder` writes one immutable evidence
file per step/repeat plus a summary that records the highest three-run stable
step and first breach (or explicitly says no breach was observed at the tested
ceiling):

```bash
pnpm lab:erp:capacity-ladder --profile http-write --steps 1,2,4,8,16,32 \
  --duration-seconds 120 --repeats 3 \
  --evidence-prefix labs/erp-domain/ecount/evidence/<run> \
  --output labs/erp-domain/ecount/evidence/<run>-summary.json
```

The capacity ladder and predeclared acceptance criteria are in
`docs/plans/2026-10-08-erp-lab-capacity-boundary.md`. The completed isolated
Lab boundary, raw-evidence links, and its decision are recorded in
`docs/evidence/2026-10-09-erp-domain-capacity-boundary.md` and
`docs/decisions/2026-10-09-erp-domain-capacity-decision.md`; they are not a
production or customer-traffic capacity claim.

## Unit-entry feedback contract

`backend/src/unit-entry-feedback.ts` is a presentation-only model for showing
the selected input unit, its normalized preview, and line-level correction
guidance. It does not replace server-side validation. The API payload and bulk
row behavior are recorded in
`docs/decisions/2026-10-07-erp-domain-unit-entry-response-contract.md`.

## Boundary

This is an isolated PostgreSQL Lab, not a migration or runtime path for the
existing Stock-Cock service. It proves only the fixed fixtures and policies in
the linked evidence: it does not establish production authorization, API/RLS
isolation, crash recovery, partial reversal, cost accounting, closing periods,
or performance at customer scale. Its DD-A2 result also does not establish
write-index trade-offs, multi-client throughput, or a Redis stale-data policy.
