# Inventory: PostgreSQL Concurrency(포스트그레스 동시성) and Legacy Write-path Consolidation(레거시 쓰기 경로 통합)

Date: 2026-09-25  
Repository: `/Users/hb/Projects/inventory/checkout`  
Start state: `inventory-consistency-reinforcement` @ `e9ef299ca495081a33754fec35602c24c55f5369`; working tree clean at inspection.  
Source of truth: this repository. Career OS(Career OS) may retain only links, a concise result, limits, and capability mapping.

## Problem framing

- **Observed problem:** Current inventory mutation has distinct writer paths: inbound/outbound(입출고) uses `/api/transactions` → `create_transaction` RPC(원격 프로시저 호출); move(이동) uses `/api/moves` → `create_inventory_move` RPC; adjustment(조정) uses `/api/adjustments` → direct transaction/item ledger writes plus `apply_inventory_adjustment` RPC; recalculation(재계산) reads the ledger then calls the adjustment RPC; product provisioning(제품 등록)은 client-side direct `inventory` insert(직접 삽입)이다. These paths do not yet share one Application Service(애플리케이션 서비스) boundary or authorization boundary(권한 경계).
- **Existing counterexample:** the retained plan/evidence describes a cross-writer stale absolute update(교차 쓰기 경로의 오래된 절대값 갱신): an ordinary reader computes 105 from 100, a cooperating delta RPC commits +1, then the old writer stores 105; the ledger implies 106. The historical raw JSON named there is absent, so it remains source-derived plus prior-report evidence, not a newly revalidated live result.
- **Existing live evidence:** `tests/inventory/results/ledgered-move-live-20260924-v3.json` is a fixed isolated PostgreSQL(포스트그레스) workload: two same-source 60-unit moves from 100 produced one success, one `INSUFFICIENT_STOCK`, observed lock wait(잠금 대기), source=40/destination=60, and matching canonical ledger(정본 원장). It does not establish HTTP, RLS(행 수준 보안), response-loss retry(응답 유실 재시도), or every writer.
- **Human hypothesis:** unrecorded.
- **Human prediction:** unrecorded.
- **AI/challenger hypothesis:** an explicit Application Service(애플리케이션 서비스) command boundary for one existing move flow can preserve the RPC result contract while making the Single Write Contract(단일 쓰기 경로 계약) explicit; it cannot make legacy direct writers globally safe until migration and permission hardening(권한 강화) are adopted.
- **Falsification condition:** if the new service invokes more than one write contract, changes the route response/error contract, or focused regression tests fail, reject this vertical slice(수직 슬라이스). If a later old/new comparison produces different persisted ledger/inventory state for the same fixture, do not migrate that flow.
- **Budget / stop condition:** one move flow only; no FastAPI(파이썬 API 프레임워크), Redis(레디스), Kafka(카프카), Kubernetes(쿠버네티스), queue(큐), broad rewrite, migration application, or production access. Stop after the plan, one service boundary, focused unit/contract validation, and an evidence checkpoint.
- **Decision required:** a human must choose whether to adopt the proposed migration policy, including whether adjustment ledger plus audit must become one database transaction(데이터베이스 트랜잭션), which direct-DML(직접 데이터 조작) exceptions remain, and the retry/idempotency(멱등성) retention policy.

## Writer-path register

| Path | Current boundary | Mutation | Current guarantee / gap |
| --- | --- | --- | --- |
| Client → `/api/transactions` → `create_transaction` RPC | Next.js route(넥스트 라우트) and DB function(데이터베이스 함수) | canonical `transactions`, `transaction_items`, existing inventory delta(델타) | RPC participants use ordered advisory lock(자문 잠금); no response-loss idempotency policy. |
| Client → `/api/moves` → `create_inventory_move` RPC | route → utility → DB function | one move header/item set plus source decrement and destination increment | single DB transaction; isolated live fixed cases passed; HTTP/RLS/retry not established. |
| Client → `/api/adjustments` → direct ledger calls + `apply_inventory_adjustment` RPC | route has orchestration | adjustment header/item and versioned absolute update(버전 있는 절대값 갱신) audit | expected-version conflict detection; header/item and audit are separate calls, therefore not one transaction. |
| Client → `/api/inventory/recalculate` → adjustment RPC | route directly reads ledger and writes correction | derived absolute correction | named reason/version contract; product policy and concurrency behavior remain incomplete. |
| Client → `registerProduct` → client Supabase direct insert | client-side service | initial inventory row | provisioning exception; current grants permit direct table mutation and it is outside the move guarantee. |

## Target and contract

```text
Client(클라이언트)
  → Inventory API Server(재고 API 서버: existing Next.js route)
  → Application Service(애플리케이션 서비스)
  → Single Write Contract(단일 쓰기 경로 계약)
  → PostgreSQL/Supabase(포스트그레스/수파베이스)
```

The minimal slice uses the existing Next.js API server(넥스트 API 서버); adding FastAPI(파이썬 API 프레임워크) would duplicate hosting, authentication, and deployment boundaries without discriminating evidence. The move Application Service(이동 애플리케이션 서비스) owns command validation and invokes exactly one injected write contract. The DB function remains the authoritative transaction boundary(트랜잭션 경계) for move header, items, source, and destination.

Trace(추적) required before wider adoption: request id(요청 식별자) → authenticated principal(인증 주체) → application-service command(애플리케이션 서비스 명령) → RPC / DB advisory-lock wait(자문 잠금 대기) → transaction id(트랜잭션 식별자) → ledger/inventory mutation(원장/재고 변경) → commit(커밋) → response. This slice defines the handoff points; it does not add telemetry(원격 측정) infrastructure.

## Concurrency and failure model

- PostgreSQL MVCC(다중 버전 동시성 제어) at READ COMMITTED(읽기 커밋 격리 수준) gives each statement a current snapshot(스냅샷); a plain read plus later absolute write can overwrite a cooperating delta unless every writer shares a contract.
- Atomic update(원자적 갱신) such as `quantity = quantity + delta` avoids a stale application-side arithmetic result for that row, but does not by itself coordinate missing-row creation, multi-row order, non-participant writers, retries, or business intent.
- Row lock(행 잠금) serializes cooperating existing-row writers; advisory lock(자문 잠금) can also serialize pair identity and missing-row choice. Both reduce concurrency(동시 처리량) while held and require consistent order. Optimistic version(낙관적 버전) detects stale absolute corrections and must define conflict/retry semantics. SERIALIZABLE(직렬화 가능 격리 수준) can abort work and still needs safe retry policy.
- Response-loss retry(응답 유실 재시도) remains undecided: a committed RPC with lost HTTP response can create a duplicate command. Before automatic retry, define an idempotency key(멱등 키), request fingerprint(요청 지문), actor scope(행위자 범위), retention(보존), result replay(결과 재전송), and notification side-effect boundary(알림 부작용 경계).
- Authorization boundary(권한 경계): route-supplied `user_id` is not proof of caller identity. A later migration must derive actor identity from verified session claims, authorize warehouse/product action, restrict direct DML(직접 데이터 조작), and retain explicit provisioning exceptions.

## Alternatives and discriminating experiments

| Alternative | Benefit | Cost / falsification experiment |
| --- | --- | --- |
| Keep route → utility only | smallest source change | boundary stays implicit; reject if a contract test cannot show one stable writer invocation. |
| Existing Next.js API Server + Application Service + DB RPC | names orchestration and preserves DB transaction | adds abstraction; accept only if old/new command fixtures produce equal RPC payload/result and one call. |
| Separate FastAPI server | independent service boundary | deployment/auth duplication; do not adopt absent evidence that Next.js boundary is insufficient. |
| DB function-only expansion | strongest DB-local transaction | application flexibility declines; compare only after adjustment atomicity is a human-approved need. |

## Safe migration plan

1. **Proxy/compatibility(프록시/호환성):** introduce one Application Service(애플리케이션 서비스) that delegates to the existing canonical RPC; preserve request/response and database schema(스키마).
2. **Write-path move(쓰기 경로 이동):** migrate one mutation class at a time through a command and contract test(계약 테스트). Run bounded dual-run comparison(이중 실행 비교) in an isolated DB: same fixture, old/new persisted ledger and inventory state, error code, and rollback result.
3. **Direct-write block(직접 쓰기 차단):** after compatibility evidence and a human decision, harden grants/RLS(행 수준 보안), permit only enumerated provisioning/administrative exceptions, and test old/new version coexistence(버전 공존).
4. **Read-path move(읽기 경로 이동), if needed:** migrate reads only when a measured authorization, consistency, or duplication problem requires it.

During old/new coexistence(구/신 경로 공존), preserve: one canonical ledger per accepted business command; inventory equals committed ledger derivation within declared adjustment semantics; no duplicate command effect for the same approved idempotency key; a failed command leaves header/items/inventory unchanged; schema compatibility(스키마 호환성) for both versions; and explicit rollback(롤백) path. Migration gate(마이그레이션 게이트): no permission revocation until isolated dual-run, contract, migration-upgrade, and rollback evidence passes.

## Verification plan

- **Unit test(단위 테스트):** command validation, a single injected contract call, canonical input mapping, error propagation.
- **Integration test(통합 테스트):** isolated PostgreSQL RPC commit/rollback, lock wait, and ledger reconciliation only when the existing environment is available.
- **Regression test(회귀 테스트):** route response/error compatibility and current migration marker checks.
- **Fault injection test(결함 주입 테스트):** post-inventory mutation failure rollback; later response-loss fixture only after idempotency policy decision.
- **Contract test(계약 테스트):** old/new command payload/result/error comparison; future authorization and schema compatibility coverage.
- **TDD Red-Green-Refactor(테스트 주도 개발 적색-녹색-리팩터):** write the service contract test, implement the smallest boundary, then refactor route delegation without semantic change.
- **Test Scope Review(테스트 범위 검토):** static/unit tests prove application wiring only; existing isolated DB JSON proves only its fixed direct-SQL workload; neither proves production throughput, RLS, HTTP retry, or global writer consistency.

## Operations, deployment, and CI

Before any rollout: verify migration safety(마이그레이션 안전성), explicit rollback compatibility(롤백 호환성), direct-write permission hardening(직접 쓰기 권한 강화), old/new coexistence(구/신 공존), health/readiness(헬스/준비 상태) that distinguishes API availability from DB/RPC/provider readiness, and a bounded smoke test(스모크 테스트). CI(지속적 통합) should run format/type/unit/contract checks and only run disposable DB integration with an explicit environment. No production-scale claim follows from these checks.

## Outcome checkpoint

- Implementation candidate: move route delegates to one injected Application Service(애플리케이션 서비스), which delegates once to the existing ledgered move RPC contract.
- Evidence path: `docs/evidence/2026-09-25-inventory-write-path-consolidation-slice.md`.
- Human decision: pending human decision.
- Changed belief: pending human decision.
- Stop condition: met for the one-flow candidate after focused validation recorded in `docs/evidence/2026-09-25-inventory-write-path-consolidation-slice.md`; do not start adjustment atomicity, idempotency storage, permission changes, or read migration automatically.
