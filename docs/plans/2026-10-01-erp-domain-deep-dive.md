# Stock-Cock ERP Domain Deep Dive Plan

- 기준 브랜치: `main`
- 목적: 기존 Stock-Cock에서 실제로 남았던 ERP 연동 미해결 요구를 출발점으로, ERP 제품 개발사(ECOUNT)와 ERP 운영 기업(인동에프엔)의 서로 다른 업무를 각각 검증 가능한 Deep Dive로 분리한다.
- 원칙: 기존 사용자용 Stock-Cock은 그대로 유지하고, 실험용 Lab을 분리한다. 실제 운영 규모에 불필요한 복잡성을 본 서비스에 주입하지 않는다.
- 실측 전 수치 금지: 처리량, latency, 개선율은 측정 전 placeholder로 남긴다.

## 1. 배경과 문제 출처

Stock-Cock은 실제 식품 제조·운영 환경에서 발생한 재고 불일치를 줄이기 위해 만든 재고관리 서비스다.

당시 실제 업무에는 재고 데이터를 ERP와 연동하려는 요구가 있었지만, 핵심 재고관리 기능 구현과 운영을 우선하면서 외부 ERP 연동까지 완료하지 못했다. 이번 작업은 채용공고에 맞춰 새 문제를 인위적으로 만드는 것이 아니라, 당시 남았던 문제를 다시 가져와 다음 단계까지 검증하는 작업이다.

다만 현재 Stock-Cock의 실제 사용자 수가 적기 때문에, 대량 처리·Redis·Queue·다중 worker 같은 구성을 기존 서비스에 직접 적용하지 않는다. 동일 도메인에서 별도 Lab을 만들어 부하와 장애 조건을 명시적으로 주고, 복잡성이 실제로 필요해지는 지점을 측정한다.

## 2. 공통 문제 정의

> 재고 변경과 ERP 업무 처리가 결합될 때, 비즈니스 정합성을 유지하면서 데이터 규모·동시성·외부 시스템 장애에 대응하려면 어떤 서버 구조가 필요한가?

공통 도메인은 다음만 공유한다.

- Product / SKU
- Warehouse
- StockMovement
- InventoryBalance
- ERP Interface Event

공통 invariant:

1. 재고는 업무 규칙을 위반해 음수가 되지 않는다.
2. 동일 업무 요청이 중복 실행되어도 결과가 중복 반영되지 않는다.
3. 재고 변동 이력은 추적 가능해야 한다.
4. 부분 실패가 발생해도 유실된 업무가 설명 없이 사라지지 않는다.
5. 성능 최적화는 먼저 병목을 측정한 뒤 적용한다.

---

# Track A. ECOUNT — ERP Product Backend

## 목표

ECOUNT는 ERP를 사용하는 기업이 아니라 ERP 제품 자체를 개발하는 회사라는 관점에서 접근한다.

핵심은 Open API 연동 자체가 아니라 다음 두 문제다.

- 복잡한 ERP 재고 업무 로직을 TypeScript + SQL로 어떻게 일관되게 표현하는가.
- 데이터가 커졌을 때 조회·집계·동시 처리의 병목을 어디서 찾고 어떻게 줄이는가.

## DD-A1. ERP 재고 업무 로직과 전표/원장 모델

### 대표 질문

> 재고 수량을 직접 수정하는 방식보다 전표/Stock Ledger 중심 모델이 ERP 업무의 취소·반품·이동·추적을 더 안전하게 처리할 수 있는가?

### 구현 범위

TypeScript 서버에서 다음 업무를 구현한다.

- 입고
- 출고
- 반품
- 조정
- 창고 간 이동
- 취소/역분개(reversal)

권장 구조:

```text
Command
  -> StockMovement / Slip
  -> Transaction
  -> InventoryBalance
  -> Audit Trail
```

`quantity = quantity - n` 같은 단순 CRUD가 아니라, 업무 이벤트를 원장으로 남기고 현재 재고를 일관되게 계산·갱신한다.

### 업무 전표와 재고 반영 경계

전표를 단순한 수량 변경 요청으로 취급하지 않는다. 최소 상태는 다음처럼 둔다.

```text
DRAFT -> CONFIRMED -> POSTED -> REVERSED
```

- `DRAFT`: 입력 검증 중인 전표로, 재고에 영향을 주지 않는다.
- `CONFIRMED`: 업무 규칙과 권한을 통과했지만 아직 재고 반영 전인 상태다.
- `POSTED`: 원장(Stock Ledger)과 현재고(InventoryBalance)를 하나의 transaction으로 반영한 확정 상태다.
- `REVERSED`: 과거 `POSTED` 전표를 수정하거나 삭제하지 않고, 원 전표를 참조하는 역분개 전표를 별도로 기록한 상태다.

반품은 가능한 경우 원 입출고 전표/항목을 참조하며, 창고 간 이동은 출발지 차감과 목적지 증가를 하나의 업무 전표로 묶는다. 실패한 이동은 어느 한쪽만 반영된 상태로 남아서는 안 된다.

### 최소 도메인 경계

이번 Deep Dive는 재고 수량 정합성에 집중한다. 다만 ERP 제품의 데이터 경계를 드러내기 위해 다음을 최소 모델에 포함한다.

- 모든 전표·원장·현재고 조회와 unique key는 `tenantId` 경계를 가진다.
- 재고는 `warehouseId`와 필요한 경우 `locationId` 단위로 구분한다.
- 입력 단위가 여러 개여도 원장에는 Product의 기본 단위로 정규화한 수량을 기록한다.

원가 평가, 회계 분개, 기간 마감은 이번 범위에 포함하지 않는다. 이들은 재고 수량 정합성이 검증된 뒤 별도 도메인으로 확장할 후보이며, 미구현 기능을 구현 완료처럼 표현하지 않는다.

### 핵심 검증

1. 동일 SKU 동시 출고
2. 출고와 취소 동시 발생
3. 동일 요청 중복 제출
4. 과거 전표 취소 후 재고 복구
5. 창고 간 이동 중 한 단계 실패
6. 일괄 전표 처리 중 일부 오류

### 설계 선택과 비교 경계

다음 항목은 같은 수준의 대안이 아니므로 분리해 비교한다.

| 구분 | 비교 대상 | 판단 질문 |
| --- | --- | --- |
| 업무 모델 | 직접 수량 수정 vs Ledger + Balance Projection | 취소·반품·추적을 원 전표 보존 상태로 설명할 수 있는가? |
| 동시성 제어 | Read → Modify → Write, Row Lock, Conditional Atomic Update | 동일 SKU/창고의 경합에서 어떤 격리와 실패 결과를 보장하는가? |
| 일괄 전표 정책 | 전체 rollback vs 건별 성공/실패 | 업무 단위가 원자적으로 완료되어야 하는가, 오류 행을 분리해 계속 처리해도 되는가? |

일괄 전표 정책은 성능 측정만으로 자동 결정하지 않는다. 아래를 Human Decision Gate로 기록한다.

- 창고 간 이동은 한 항목이라도 실패하면 전체 rollback한다.
- 대량 입고 업로드는 성공 행과 실패 행을 분리할 수 있으며, 실패 행에는 업무 오류 사유를 남긴다.
- 동일 business transaction ID/idempotency key의 재시도는 새 원장을 만들지 않고 최초 확정 결과를 반환한다.

### Evidence

- invariant 위반 건수
- transaction latency
- lock wait
- duplicate 처리 결과
- reversal 이후 balance 검증
- audit trail 재현 가능 여부
- tenant별 원장/현재고 분리 검증
- 시나리오 종료 뒤 원장 합계와 현재고를 대사한 결과

### 사후 대사(Reconciliation) acceptance

각 동시성·실패 주입 시나리오가 끝난 뒤 HTTP 응답이나 처리량만으로 성공을 판단하지 않는다. 자동 대사에서 다음을 확인한다.

1. 각 `tenantId`·SKU·warehouse/location별 `POSTED` 원장 합계와 `InventoryBalance`가 일치한다.
2. 동일 idempotency key는 원장 한 건만 생성하며 같은 확정 결과를 반환한다.
3. 실패한 이동은 출발지와 목적지 모두에 수량 변화가 없다.
4. 역분개 후 원 전표는 보존되고, 참조 관계와 잔액 복구를 추적할 수 있다.
5. 다른 tenant의 전표·현재고가 조회 또는 갱신에 섞이지 않는다.

### 종료 조건

재고 정합성을 유지한 채 입고/출고/반품/이동/취소를 동일한 업무 모델과 전표 상태 전이로 설명할 수 있고, 사후 대사를 통과한다. 선택한 transaction 전략·일괄 전표 정책·버린 대안을 근거와 함께 설명할 수 있다.

---

## DD-A2. 대량 ERP 데이터 조회·집계와 성능 병목

### 대표 질문

> 재고 전표가 누적될수록 현재 재고·기간별 입출고·창고별 집계 조회의 병목은 어디서 발생하며, SQL·인덱스·사전 집계·Redis 중 무엇이 실제로 필요한가?

### Workload

실제 고객 수를 주장하지 않는다. 성능 한계 탐색을 위한 synthetic workload로 명시한다.

예시 축:

- tenant 수 증가
- SKU 수 증가
- StockMovement 수 증가
- 특정 SKU/창고 hot key 집중
- 조회:쓰기 비율 변화

정확한 건수는 baseline 측정 후 단계적으로 키운다.

### 실험 순서

1. Baseline SQL
2. 실행 계획 확인
3. 적절한 index
4. query rewrite
5. aggregation 전략
6. 필요할 때만 Redis 적용

Redis는 "기술 사용"이 목적이 아니다. SQL 최적화 후에도 반복 조회가 병목으로 남았을 때만 적용한다.

### 직접 구현 자료구조: bounded LRU cache

이 항목은 Redis 도입이나 실제 재고 write path 적용을 전제하지 않는 독립된 TypeScript 학습·검증 산출물이다. `Map`과 직접 구현한 doubly linked list를 결합한 generic `LruCache<K, V>`를 Lab의 shared 구조로 둔다.

- `get(key)`: hash map으로 노드를 찾고, hit 노드를 최근 사용 위치(head)로 옮긴다.
- `put(key, value)`: 기존 key는 값을 갱신해 head로 옮기고, 새 key는 head에 넣는다.
- capacity 초과: 가장 오래 사용되지 않은 tail 노드를 연결 리스트와 hash map에서 함께 제거한다.
- 시간 복잡도: `get`, `put`, 최근 항목 이동, tail eviction 모두 평균 O(1)이다.

구현체는 hit/miss, 기존 key 갱신, 최근 사용 순서 승격, capacity 초과 eviction, capacity 0을 단위 테스트로 검증한다. 이 구현은 지원서의 "직접 구현한 자료구조" 증거로 사용할 수 있지만, 재고 조회 성능 개선에 적용했다고 주장하지 않는다. 실제 cache 채택은 DD-A2 workload에서 반복 조회 병목과 stale-data 정책이 확인된 뒤의 Human Decision Gate다.

### 조회 시나리오

- 현재 재고
- SKU별 재고
- 창고별 재고
- 기간별 입출고
- 최근 거래 이력
- 부족 재고 목록

### Evidence

- p50 / p95 / p99
- throughput
- query count
- DB CPU
- scanned rows
- connection wait
- cache hit ratio(사용 시)
- index/cache 적용 전후 차이

### 인프라

- NestJS 또는 TypeScript server
- PostgreSQL
- Redis(측정 결과 필요 시)
- Docker Compose
- k6/Artillery
- Prometheus/Grafana 또는 동등한 metric stack

Kubernetes나 클라우드 도입 자체는 범위에 넣지 않는다. 현재 질문을 검증하는 데 필요할 때만 후속 backlog로 둔다.

### 종료 조건

병목을 수치로 식별하고, SQL/index/aggregation/cache 중 어떤 수단이 가장 큰 효과를 냈는지 설명할 수 있다.

---

# Track B. INDONG F&N — Enterprise ERP / IT Operations

## 목표

인동에프엔은 ERP 제품 개발사라기보다 패션기업 내부에서 ERP와 업무 시스템을 개발·운영하는 전산 조직이라는 관점에서 접근한다.

따라서 중심은 다음 두 문제다.

- 기존 업무 시스템과 ERP 사이의 외부 인터페이스를 어떻게 신뢰성 있게 운영하는가.
- 기존 인터페이스와 레거시 사용자를 깨뜨리지 않고 Java/Spring 기반으로 어떻게 개선하는가.

## DD-B1. ERP Interface Reliability

### 대표 질문

> 내부 재고 DB는 성공했지만 ERP 반영이 실패하는 부분 실패 상황에서 업무 유실·중복 없이 두 시스템을 최종적으로 일치시킬 수 있는가?

### 기술 환경

- Java
- Spring Boot
- MyBatis
- Oracle Free/XE 또는 Oracle 호환 실험 환경
- 필요 시 ECOUNT Open API 또는 명세가 통제 가능한 Mock ERP

실제 외부 API를 사용할 수 있더라도 failure injection을 위해 mock endpoint를 병행한다.

### Baseline

```text
Request
 -> DB Transaction
 -> ERP API
 -> Response
```

먼저 단순 동기 구조를 만들고 다음 조건을 재현한다.

- ERP 500
- timeout
- 응답 유실
- 중복 재시도
- worker/process 종료

### 개선 후보

```text
Business Transaction
 -> Interface Outbox
 -> Worker
 -> ERP
 -> Sync State
 -> Reconciliation
```

검증 요소:

- idempotency
- retry/backoff
- outbox
- failed/dead-letter 상태
- interface audit log
- reconciliation

### 핵심 장애

1. 내부 DB 성공 / ERP 실패
2. ERP 성공 / 응답 timeout
3. 동일 요청 재전송
4. worker crash
5. ERP 점검/장시간 장애
6. 재기동 이후 미처리 건 복구

### Evidence

- 유실 job 수
- duplicate 반영 수
- retry 횟수
- recovery time
- unresolved mismatch 수
- interface 상태 추적 가능 여부

### 종료 조건

DB와 외부 ERP를 하나의 로컬 transaction으로 묶을 수 없다는 한계를 설명하고, 부분 실패 이후 eventual consistency를 어떻게 회복하는지 실측으로 증명할 수 있다.

---

## DD-B2. Legacy Compatibility + Safe Modernization + Operation

### 대표 질문

> 기존 업무 인터페이스 계약을 유지한 채 내부 구현을 Spring/MyBatis 기반으로 교체하고, 장애 시 안전하게 롤백할 수 있는가?

### 문제 설정

신규 서비스를 처음부터 만드는 것이 아니라 "기존 클라이언트와 업무 계약을 바꾸기 어렵다"는 제약을 둔다.

```text
Legacy Client
   -> Compatibility Layer
      -> Legacy Path
      -> New Spring Path
         -> MyBatis
         -> Oracle
```

MiPlatform 자체를 억지로 재현하는 것이 목적은 아니다. 기존 요청/응답 계약이 강하게 고정된 엔터프라이즈 클라이언트를 모델링한다.

### 구현 범위

- 기존 request/response contract fixture
- Spring Controller / Service / Mapper
- MyBatis SQL
- Oracle transaction
- legacy/new 결과 비교
- schema migration
- backward compatibility
- feature flag 또는 traffic switch
- rollback path

### 운영 실험

- Spring app graceful shutdown
- in-flight request 처리
- DB pool 반환
- application restart
- health check
- Nginx/reverse proxy
- app 1대 vs 2대
- deployment rollback
- structured application log
- JVM memory / connection pool 관찰

Kubernetes는 기본 범위에서 제외한다. 먼저 Linux/Docker/reverse proxy/JVM/DB pool 수준의 운영 문제를 직접 다룬다.

### Evidence

- 기존 contract regression 결과
- legacy/new output diff
- migration 전후 데이터 검증
- restart 중 실패 요청 수
- graceful shutdown 성공 여부
- rollback 시간과 복구 결과
- DB pool/latency 변화

### 종료 조건

"새로 만드는 능력"뿐 아니라 기존 계약을 보존하면서 변경 범위를 통제하고 운영 중 실패에 복구하는 과정을 설명할 수 있다.

---

# 3. 공통 Lab 구조

기존 Next.js/Supabase 사용자용 코드는 유지한다.

권장 구조:

```text
stock-cock/
├── src/                    # 기존 서비스
├── supabase/               # 기존 서비스
└── labs/
    └── erp-domain/
        ├── ecount/
        │   ├── backend/
        │   ├── load-tests/
        │   └── experiments/
        ├── indong/
        │   ├── spring-backend/
        │   ├── mock-erp/
        │   └── experiments/
        └── shared/
            ├── structures/
            ├── workload/
            └── fixtures/
```

구현 시 실제 구조는 기존 package manager, workspace 구성, build 영향도를 확인한 뒤 결정한다.

# 4. Engineering Loop

각 Deep Dive는 다음 순서로 닫는다.

1. Problem
2. Human hypothesis
3. Prediction
4. Falsification condition
5. Baseline
6. Experiment
7. Evidence
8. Human decision
9. Changed belief
10. Stop condition 확인

AI가 구현·부하 생성·로그 집계를 지원하더라도, 실험 전 prediction과 최종 판단은 별도로 기록한다.

# 5. Observability 원칙

관측 도구를 설치하는 것 자체는 성과로 보지 않는다.

최소 관찰 대상:

- request rate
- p95/p99 latency
- error rate
- DB connection pool
- query latency
- lock wait
- queue depth(사용 시)
- worker throughput(사용 시)
- external ERP latency/error
- retry count
- CPU/RSS

trace/log는 request id, business transaction id, stock movement id, interface event id를 연결할 수 있어야 한다.

# 6. 진행 순서

## Cycle 0 — Baseline & Domain Extraction

- 기존 Stock-Cock 재고 write path 조사
- 현재 transaction/RPC 경계 확인
- 실제 서비스에 불필요한 변경 금지
- 공통 fixture와 invariant 정의
- Evidence: `docs/evidence/2026-10-06-erp-domain-cycle-0-baseline.md`

## Cycle 1 — ECOUNT DD-A1

- TypeScript ERP inventory domain
- ledger/slip model
- concurrency/reversal 검증
- 첫 전표 확정 및 재고 반영 slice evidence: `docs/evidence/2026-10-06-erp-domain-dd-a1-posting-cycle.md`
- raw result: `labs/erp-domain/ecount/evidence/2026-10-07-posting-v9-package-normalization.json`
- 현재 검증 범위: 입고, 출고, 단일 항목 이동 실패 rollback, tenant 분리,
  duplicate delivery, 역분개 원장/원 전표 보존, 중복 역분개 차단,
  역분개와 출고 동시 실행, 동일 재고 키 동시 출고, 원 출고 항목 참조 부분 반품과
  과다 반품 차단, 조정 입·출고, 다중 항목 이동의 전체 rollback, 대량 입고 행별
  성공/실패, 완제품 `EA`·원재료 `g` 기준 단위, `BOX → EA`·`kg → g` 입력 정규화,
  ledger/balance 사후 대사
- Cycle 1 종료: 선택한 수량 도메인과 fixture에서 종료 조건을 충족했다.
- 미완료: 부분 역분개, 반품 출고/반품 교환, 원가·회계·기간 마감, API/RLS,
  restart/retry, 다중 문서 교착 회피 증명, 포장·수율·BOM·lot 단위 정책, 성능 workload. 이 결과를 기존
  Stock-Cock 또는 운영 정합성 주장으로 확장하지 않는다.

## Cycle 1.5 — ECOUNT TypeScript HTTP vertical slice

Cycle 1의 SQL·Python harness 검증을 실제 TypeScript Web Backend 경로로 연결한다.
기존 Stock-Cock route와 database는 변경하지 않고, disposable ERP Lab PostgreSQL에만 연결한다.

- `POST /lab/erp/inventory-documents`: TypeScript command validation 뒤 `DRAFT` 생성
- `POST /lab/erp/inventory-documents/:id/confirm`: `CONFIRMED` 전이
- `POST /lab/erp/inventory-documents/:id/post`: `POSTED` 전이와 원장·현재고 반영
- `GET /lab/erp/inventory-documents/:id`: 전표 상태, line, ledger, balance를 tenant 경계로 조회
- SQLSTATE/업무 오류는 기술 메시지 대신 HTTP status와 안정된 code로 변환한다. `INVALID_DOCUMENT_UNIT`은 line index, 허용 단위, 기준 단위를 포함하는 사용자 피드백 계약으로 변환한다.
- HTTP integration harness는 disposable DB에서 입고→확정→반영, 중복 요청, 단위 오류, 재고 부족, tenant 경계, 역분개를 호출하고 원장·현재고 대사를 확인한다.
- raw result: `labs/erp-domain/ecount/evidence/2026-10-07-http-vertical-slice-v1.json`

### Acceptance

1. TypeScript HTTP process가 PostgreSQL adapter를 통해 전표 상태 전이를 수행한다.
2. 단위 오류와 재고 부족은 예상 가능한 HTTP 응답으로 구분되며, 실패 요청은 원장·현재고를 변경하지 않는다.
3. HTTP 결과만으로 성공을 판단하지 않고, 각 시나리오 후 대사 결과를 확인한다.
4. 이 slice는 인증/RLS, production connection pool, restart recovery, global writer, 실제 사용자 UI를 증명하지 않는다.

## Cycle 2 — ECOUNT DD-A2

- synthetic read fixture: tenant 1, SKU 1,000, ledger 120,000행, location 2,
  hot SKU 50% (`labs/erp-domain/ecount/test/query_benchmark.py`)
- baseline / after raw result: `labs/erp-domain/ecount/evidence/2026-10-07-dd-a2-read-baseline-v2.json`
- Evidence: `docs/evidence/2026-10-07-erp-domain-dd-a2-read-cycle.md`
- Decision: `docs/decisions/2026-10-07-erp-domain-dd-a2-read-index-decision.md`
- 선택: 최근 원장·기간 집계·부족 재고에 복합 index. current-stock은 기존 PK로 충분했다.
- 미선택: Redis, aggregation table, queue, Kubernetes. 이 workload에서 필요성이 측정되지 않았다.
- 종료: 고정 synthetic read fixture의 병목을 plan과 수치로 식별하고, index가 가장 큰 효과를 냈음을 확인했다. write 비용·운영 규모·cache stale policy는 별도 workload 전까지 미검증이다.

## Cycle 2.5 — ECOUNT 용량 경계: 대량 입고·동시 HTTP·혼합 부하

Cycle 2의 읽기 benchmark는 용량 계획이 아니다. Cycle 2.5는 이미 구현된 `bulk_receipt_documents`와 TypeScript HTTP slice를 출발점으로, 단일 Lab topology가 어떤 **명시된 synthetic workload**에서 안정적인지와 최초 임계 신호를 측정한다.

- 상세 계획: `docs/plans/2026-10-08-erp-lab-capacity-boundary.md`
- 측정 기록: `docs/evidence/2026-10-09-erp-domain-capacity-boundary.md`
- 설계 결정: `docs/decisions/2026-10-09-erp-domain-capacity-decision.md`
- 대상: 대량 입고 volume/chunk, hot-key 경합, HTTP read/write/mixed concurrency
- 결과: profile별 최고 안정 단계, 최초 breach, reconciliation, DB/pool/lock telemetry, 다음 설계 선택 또는 미선택 근거
- 원칙: Kafka/Redis/queue/job worker를 선도입하지 않는다. baseline이 durable progress/restart 또는 특정 병목을 요구할 때만 하나의 후속 개선을 선택한다.
- 경계: disposable loopback DB + local TypeScript process의 synthetic Lab 결과이며, Stock-Cock 운영 트래픽, 고객 규모, production capacity, global writer 보증이 아니다.
- 완료 범위: import는 10,000행/60초 예산이 최고 안정, 50,000행에서 최초 예산 초과. HTTP는 짧은 8초 반복에서 read 128→256, hot-key write 128→256, mixed 64→128이 각각 안정→최초 기준 초과 구간이었다. 장시간 soak과 durable import recovery는 미검증이다.
- 후속 개선: 50,000행의 동기 요청 예산 초과에만 대응해 DB 기반 durable import job을 구현했다. 1,000행 chunk와 lease를 사용하며, 3,000행 처리 뒤 lease 교체 후 50,000행(49,999 반영/1 거절)을 대사 0으로 완료했다. 이번 cycle은 단일 TypeScript worker로 종료한다. HTTP API·다중 worker·장시간 운영은 의도적으로 범위 밖이며, 이를 도입·검증했다고 주장하지 않는다.

## Cycle 3 — INDONG DD-B1

- Spring/MyBatis/Oracle baseline
- sync ERP interface
- partial failure 재현
- outbox/retry/idempotency/reconciliation

## Cycle 4 — INDONG DD-B2

- legacy contract fixture
- compatibility layer
- regression/migration
- restart/rollback/operation experiment

## Cycle 5 — Portfolio Closure

- 각 회사별 README section 분리
- 수치와 그래프는 실측만 사용
- 실제 Stock-Cock과 Lab을 명확히 구분
- "현재 실제 사용자 규모에 왜 이 구조를 적용하지 않았는가" 답변 포함

# 7. 오버엔지니어링 방어

이 Lab의 대량 데이터와 인프라 조건은 기존 Stock-Cock 운영 요구사항이라고 주장하지 않는다.

면접 설명 기준:

> 실제 Stock-Cock 규모에서는 단순한 구조가 적절하다고 판단했습니다. 다만 당시 해결하지 못했던 ERP 연동 문제와 ERP 서버 직무를 더 깊게 이해하기 위해 동일한 재고 도메인을 별도 Lab으로 분리했고, synthetic workload와 failure injection으로 복잡성이 필요해지는 경계를 측정했습니다.

따라서 "많이 붙였다"가 아니라 다음이 평가 대상이다.

- 어느 시점까지 단순 구조가 충분했는가.
- 병목/장애가 실제로 발생했는가.
- 그 결과 어떤 복잡성을 추가했는가.
- 추가한 복잡성이 실제로 문제를 줄였는가.
- 효과가 없었던 기술은 제거하거나 채택하지 않았는가.

# 8. 최종 산출물

각 DD마다 최소 다음을 남긴다.

- plan
- experiment fixture/workload
- baseline result
- change
- after result
- decision
- raw evidence 위치
- limitation
- stop condition

최종 포트폴리오에는 구현 목록보다 아래 질문에 대한 답을 우선한다.

## ECOUNT

1. ERP 재고를 어떤 업무 모델로 표현했는가.
2. 복잡한 transaction을 어떻게 정합성 있게 처리했는가.
3. 데이터가 커졌을 때 병목은 어디였는가.
4. SQL/index/Redis 중 무엇이 실제 효과가 있었는가.

## INDONG

1. ERP 부분 실패를 어떻게 복구했는가.
2. 중복/timeout에서 업무 중복을 어떻게 막았는가.
3. 기존 인터페이스 계약을 어떻게 보존했는가.
4. 배포/재기동/rollback 상황에서 어떻게 안전성을 확인했는가.

# 9. 전체 종료 조건

다음 조건을 만족하면 범위를 더 확장하지 않는다.

- ECOUNT 2개 DD와 INDONG 2개 DD 각각 최소 1개의 baseline → experiment → evidence → decision cycle이 닫혔다.
- 각 DD의 핵심 설계 선택을 수치와 failure case로 방어할 수 있다.
- 실험 결과에 따라 필요 없다고 판단한 기술을 명확히 말할 수 있다.
- 기존 Stock-Cock에 왜 동일 인프라를 적용하지 않았는지 설명할 수 있다.
- 실측하지 않은 규모/성능을 포트폴리오 성과처럼 표현하지 않는다.

후속 후보(Kubernetes, cloud autoscaling, Kafka 등)는 현재 실험에서 명확한 필요성이 나타난 경우에만 별도 Cycle로 연다.
