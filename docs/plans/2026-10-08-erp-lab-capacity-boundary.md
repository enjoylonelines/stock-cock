# ERP Lab Capacity Boundary Plan

- Status: measured in an isolated Lab; see `docs/evidence/2026-10-09-erp-domain-capacity-boundary.md` and `docs/decisions/2026-10-09-erp-domain-capacity-decision.md`.
- Scope: isolated `labs/erp-domain/ecount` PostgreSQL + one local TypeScript HTTP process.
- Decision this plan must support: under a versioned synthetic workload, what is the highest stable read/write/import load for the current simple topology, which signal fails first, and which *specific* next design should be considered for that signal?

## 1. Current-state audit

| Area | Verified current state | What it does not establish |
| --- | --- | --- |
| Domain write | `post_confirmed_document` records a confirmed document, ledger entries, and balance projection in one database transaction; balance keys are ordered before multi-line changes. | HTTP throughput, pool saturation, restart handling, or multi-process writer behavior. |
| Bulk receipt | `bulk_receipt_documents(tenant, rows)` accepts JSON rows and returns `POSTED` or `REJECTED` for every row. Each row has an idempotency key and follows the existing document workflow. | A persisted import job, progress/recovery, a retry queue, or a safe request body contract for a 100,000-row upload. |
| HTTP slice | A single TypeScript process exposes create, confirm, post, reverse, and tenant-scoped document read. Its PostgreSQL adapter has a pool maximum of 4. | A public API, authentication/RLS, horizontal workers, or server-side latency telemetry. |
| Read benchmark | Disposable fixture: 1 tenant, 1,000 products, 120,000 ledger rows, two locations, 50% hot-product share. Indexes improved recent-history p95 from 8.692ms to 1.162ms and period movement p95 from 12.166ms to 2.922ms. | Multi-client throughput, write/index trade-off, batch-ingest rate, a customer-data capacity, or cache policy. |

The existing `bulk_receipt_documents` function is the correct starting point. This cycle must not add Kafka, Redis, Kubernetes, or a queue merely to make the architecture look larger.

## 2. Hypotheses and explicit boundaries

### H1 — import throughput and correctness

For receipt imports with independent rows, the existing row-level success/rejection policy can process an increasing synthetic volume without duplicate documents and with zero ledger/balance mismatch. The first failed acceptance condition identifies the current topology's import boundary; it is not a production capacity number.

### H2 — HTTP pool and hot-key contention

With one TypeScript process and PostgreSQL pool `max=4`, increasing concurrent workflows will eventually make either pool wait, database lock wait, client p95, error rate, or reconciliation fail first. The experiment must identify which one, not assume it is a lock or Node.js.

### H3 — read/write interference

The read indexes chosen in Cycle 2 may remain sufficient under a defined mixed workload, or write cost may become the first trade-off. A read-only benchmark cannot answer this.

### Non-goals

- No claim about real Stock-Cock traffic, ECOUNT customers, internet latency, authentication/RLS, production autoscaling, crash recovery, or global ordering.
- No arbitrary conversion from a loopback RPS result to "concurrent users".
- No Redis/cache addition unless a measured repeated read bottleneck remains after SQL/index review and a stale-data policy is decided.
- No queue/job-worker adoption until the baseline identifies a concrete trigger. The existing bulk SQL function is measured first; a durable job is a conditional follow-up, not an assumed solution.

## 3. Measurement contract before implementation

Every run writes a JSON evidence file and a Markdown decision record. They contain:

- Git SHA, dirty-tree status, schema files, Node/Python/PostgreSQL versions, host CPU/RAM, Docker resource limits, `Pool.max`, test runner command, warm-up and measurement duration.
- Deterministic fixture seed, tenant/product/location counts, total documents/rows, hot-key percentage, valid/rejected/duplicate row mix, and exact request mix.
- Per-operation count, successful/expected-business-rejection/unexpected-error count, p50/p95/p99 client latency, elapsed time, and throughput.
- PostgreSQL snapshots before/during/after: `pg_stat_database`, active/waiting sessions, lock-wait count/duration, and database size. If a metric cannot be collected, record it as unavailable rather than substituting a guess.
- Reconciliation result, document count versus unique idempotency-key count, and every expected rejection code.

The Lab acceptance thresholds are declared before a run, not chosen after seeing the result:

| Profile | Stable-run acceptance |
| --- | --- |
| Import | all accepted/rejected rows are accounted for within the predeclared 60-second measurement budget; duplicate replay creates zero additional documents/ledger rows; reconciliation mismatch is 0; unexpected error rate is 0%. A timeout returns a partial-row count and is the first breach, not a discarded run. |
| HTTP write | reconciliation mismatch is 0; unexpected 5xx/timeout rate is 0%; p95 workflow latency is at most 500ms. Business rejections are counted separately. |
| HTTP read | unexpected 5xx/timeout rate is 0%; p95 response latency is at most 200ms. |
| Mixed | all of the corresponding read and write conditions hold. |

The first concurrency/volume step that violates any condition is the **first breach**. The preceding step passes only when three fresh runs all pass. "Highest stable" means that preceding level, not an interpolated value.

## 4. Workload design

### Fixture families

1. **Import-uniform**: receipt rows distributed across 1,000 products and two locations.
2. **Import-hot-key**: the same product/location receives 50% of receipt rows; the rest remain uniform. Receipt is used so insufficient stock does not obscure lock behavior.
3. **HTTP-read**: existing posted documents and the Cycle 2 120,000-ledger fixture support tenant-scoped detail and history/read queries added for this experiment.
4. **HTTP-write-hot-key**: valid receipt workflows target a known product/location; each generated document key is unique.
5. **Mixed**: 80% read requests and 20% complete receipt workflows, with the hot-key percentage recorded.

All fixture data is synthetic, rebuilt for each repeat, and isolated from Stock-Cock. A deliberate invalid-unit row and a duplicate idempotency key are included in each import run so the result proves row accounting, not only happy-path speed.

### Load ladder

| Axis | Steps | Why |
| --- | --- | --- |
| Import volume | 1,000 → 10,000 → 50,000 → 100,000 rows | Finds a volume knee without initially making 100,000 an unverified claim. |
| Import chunk size | 100 → 500 → 1,000 rows/call | Separates round-trip overhead from oversized JSON/transaction pressure. |
| HTTP concurrency | 1 → 2 → 4 → 8 → 16 → 32 active workflows | Crosses the current four-connection pool boundary gradually. |
| Mixed duration | 30s warm-up + 120s measurement per step, repeated three times | Avoids treating a cold start or one lucky run as capacity. |

The import profile first measures the existing database function through a TypeScript runner. It does **not** pretend that a direct database call is an HTTP upload. HTTP profiles use the existing TypeScript server; each write workflow is create → confirm → post and records the end-to-end workflow duration.

## 5. Minimal implementation plan

### Step 0 — reproducible runner and telemetry

- Add `labs/erp-domain/ecount/test/capacity_benchmark.py` as the orchestrator. It rebuilds the disposable database, starts/stops the existing Lab HTTP process for HTTP profiles, and refuses to overwrite evidence.
- Add TypeScript fixture helpers under `labs/erp-domain/ecount/backend/` only when they reuse the application command/adapter boundary. Do not duplicate posting SQL in a benchmark-only implementation.
- Add a PostgreSQL telemetry collector and write unavailable metrics explicitly.
- Add `pnpm lab:erp:capacity` only if it wraps the reproducible runner without hiding its arguments.

Acceptance: a one-step smoke run creates an evidence JSON with environment manifest, counters, and a zero-mismatch reconciliation result.

### Step 1 — direct bulk-receipt baseline

- Run the import-uniform family at each volume/chunk step through `bulk_receipt_documents`.
- Capture accepted, expected rejected, duplicate replay, documents, ledger rows, balances, elapsed time, rows/sec, and database telemetry.
- Re-run the same import manifest. Confirm that unique tenant/idempotency-key count, document count, and ledger count do not grow on replay.

Acceptance: every row has one terminal result and duplicate replay adds no document/ledger entry. If 100,000 does not pass, record the first breach instead of reducing the reported volume.

### Step 2 — hot-key and lock observation

- Repeat Step 1 with the 50% hot-key distribution and HTTP-write-hot-key concurrency ladder.
- Capture waiting sessions and locks while the run is active; do not infer lock wait only from a higher p95.
- Compare uniform versus hot-key throughput and latency at the same volume/concurrency.

Acceptance: lock/connection/CPU signals identify the first bottleneck class, and every completed workflow still reconciles.

### Step 3 — HTTP read, write, and mixed capacity

- Extend the Lab only with the tenant-scoped read endpoint(s) necessary to execute the recorded read profile; document their query plans.
- Run read-only, write-only, then the fixed 80/20 mixed profile at each concurrency step. Rebuild the fixture between repeats.
- Preserve expected 400/409 business outcomes as a separate counter. A business rejection is neither a success nor a server failure.

Acceptance: identify the highest stable concurrency and first breach separately for read, write, and mixed profiles.

### Step 4 — one evidence-led improvement, only if needed

Choose exactly one response after Steps 1–3; do not stack changes.

| First observed failure | Candidate next change | Required proof before adoption |
| --- | --- | --- |
| Query plan/scan cost grows while writes remain stable | targeted index, cursor query, or bounded summary table | before/after plan and identical workload improvement; write-cost measurement. |
| Pool wait dominates while DB is not saturated | bounded concurrency/admission control or pool sizing experiment | waits and p95 improve without higher error/reconciliation failure. |
| Hot-key lock wait dominates | import chunk policy or product/location-keyed serialization | fewer lock waits while preserving per-document atomicity and row-result policy. |
| HTTP process CPU/event-loop saturation dominates | bounded worker/process experiment with shared DB state | independent process evidence; no claim of global writer safety without it. |
| Durable progress/restart is the unmet requirement, not throughput | persisted `import_jobs` + row staging/job result model | process-stop/restart, idempotent resume, row accounting, and reconciliation evidence. |

Redis, Kafka, and a generic worker queue are deliberately absent from the first improvement table unless a measured failure maps to their actual responsibility.

## 6. Conditional durable-import design (Human Decision Gate)

Do not implement this before Step 4 selects it. If restart/progress is the observed requirement, add:

- `import_jobs`: tenant, import idempotency key, status (`QUEUED`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_REJECTIONS`, `FAILED`), requested/processed/posted/rejected counts, timestamps, and failure summary.
- `import_job_rows`: job id, row index, immutable input payload/hash, terminal status, document id, stable error code, and attempt count.
- A worker claims one job with a lease/fencing token, processes bounded chunks, writes each row's terminal result, and makes resume idempotent through the existing document idempotency key.

This is intentionally not a claim of cross-process recovery until a fresh worker process resumes a stopped job and the evidence proves no duplicate posting.

## 7. Evidence, decision, and portfolio wording

New artifacts:

- `labs/erp-domain/ecount/evidence/YYYY-MM-DD-capacity-baseline-v1.json`
- `docs/evidence/YYYY-MM-DD-erp-domain-capacity-boundary.md`
- `docs/decisions/YYYY-MM-DD-erp-domain-capacity-decision.md`

The decision record must include a table of highest stable level, first breach, conditions, and selected/non-selected next design per profile. It must name environment limits and state that the result is a synthetic loopback Lab result.

Only after this evidence exists may the portfolio say:

> 고정 synthetic 전표/조회 workload에서 단일 TypeScript 서버와 PostgreSQL의 읽기·쓰기·대량 입고 안정 구간과 최초 임계 지점을 측정하고, 병목 신호별 다음 설계 선택 기준을 남겼다.

It must not say "customer traffic", "production capacity", "large-scale distributed processing", or a concurrent-user number not measured by this workload.

## 8. Stop conditions

Stop the cycle when all three profiles have one highest-stable and one first-breach result, reconciliation remains zero for all completed runs, and one evidence-led decision is recorded. Do not add durable jobs, cache, queues, or multiple workers when no measured result calls for them.

## 9. Execution note (2026-10-09)

- Import used the declared 60-second budget and three fresh repeats per level.
- HTTP read, write, and 80/20 mixed workloads used three fresh 8-second measurement repeats per level. The initial 30-second warm-up/120-second duration in the design was not run because the local execution environment bounds one invocation; this is a shorter exploratory capacity boundary, not a replacement for a soak test.
- The first mixed runner exposed a harness defect: stopping the `pnpm` parent could leave its child HTTP process alive, which could mix a later run with an earlier schema. The harness now terminates the process group and treats a `POSTED` document without a ledger entry as a reconciliation failure. Only `*-v2-*` HTTP/mixed evidence created after that repair is used in the decision.
