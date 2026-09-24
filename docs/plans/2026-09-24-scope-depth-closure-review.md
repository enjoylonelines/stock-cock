# Inventory 프로젝트 범위·깊이·종료 검토

작성일: 2026-09-24  
기준 브랜치: `inventory-consistency-reinforcement` @ `7c0fe84`

## 1. 현재 변경사항 검토

현재 branch는 이미 좋은 방향으로 정리되어 있다.

- 동일 SKU·창고의 concurrent inbound 보강
- migration duplicate gate
- worker 2/4/8 bounded contention 측정
- cross-writer stale absolute update 반례 재현
- RPC 범위 보장과 전역 정합성 보장을 구분
- Kafka/Redis/queue/서버 분리를 의도적으로 도입하지 않음

이 프로젝트에서 필요한 것은 기능 확장이 아니라 **DB concurrency의 내부 원리를 더 깊게 설명하고, 한계를 하나 더 명확히 닫는 것**이다.

## 2. 대표 문제

> 여러 사용자가 같은 SKU·창고의 재고를 동시에 변경할 때 원장과 현재 재고가 어긋나지 않도록 transaction 경계와 writer contract를 설계한다.

## 3. 깊이 축

### 축 A — PostgreSQL concurrency

- lost update가 어떤 interleaving에서 발생하는지
- atomic update와 read-modify-write 차이
- row/advisory lock의 실제 획득 범위
- MVCC에서 일반 SELECT가 lock과 어떻게 상호작용하는지
- READ COMMITTED에서 statement 사이 무엇이 바뀔 수 있는지
- lock 순서에 따른 deadlock 가능성
- transaction 시간이 connection pool과 throughput에 미치는 영향

### 축 B — writer contract / retry

- 하나의 RPC만 안전해도 전역 invariant를 보장하지 못하는 이유
- stale absolute writer가 atomic increment를 어떻게 덮어쓰는지
- commit 성공 후 응답 유실 시 duplicate transaction 위험
- idempotency key가 필요한 정확한 조건
- retryable DB error와 business rejection을 어떻게 구분할지

## 4. 수정 방향

### 유지

- 현재 RPC 범위의 consistency guarantee
- duplicate migration gate
- bounded concurrency measurement
- cross-writer counterexample
- global guarantee를 과장하지 않는 현재 문서

### 추가로 깊게 볼 것

기능을 늘리지 말고 아래 두 실험만 허용한다.

1. 실제 DB session 2개로 lost-update/lock wait interleaving을 사람이 따라갈 수 있게 재현
2. response-loss + retry를 작은 fault injection으로 재현해 idempotency가 필요한 경계를 확인

두 번째는 실제 API retry 요구가 없으면 구현 도입 없이 evidence로만 종료 가능하다.

### 중단

- Kafka
- Redis distributed lock
- 별도 대규모 backend rewrite
- Kubernetes
- 가상의 대규모 사용자 수를 위한 scale architecture

## 5. 종료 조건

- concurrent write interleaving을 SQL/session 수준으로 설명 가능
- 현재 RPC가 보장하는 범위와 우회 writer를 정확히 구분
- lock wait/deadlock/connection pool 관계를 설명 가능
- bounded workload 수치를 운영 TPS로 과장하지 않음
- idempotency가 왜 필요할 수 있는지 failure sequence로 설명 가능
- 전역 writer 통합을 하지 않았다면 그 한계를 명확히 남김

## 6. 면접 방어 질문

- 왜 atomic `UPDATE quantity = quantity + ?`가 read→write보다 안전한가?
- advisory lock과 row lock은 무엇이 다른가?
- MVCC인데 왜 lock이 필요한가?
- READ COMMITTED에서 어떤 anomaly가 가능한가?
- cross-writer 반례가 왜 생겼나?
- commit은 됐는데 HTTP response가 유실되면?
- connection pool이 작을 때 lock contention이 왜 latency로 나타나나?

## 7. 다음 작업 1개

새 인프라를 추가하지 않고, **현재 cross-writer 반례를 실제 transaction interleaving 관점으로 문서화해 DB 내부 동작까지 설명 가능한 상태로 만든다.** 그 뒤 response-loss/idempotency는 실제 필요성을 확인한 경우에만 별도 사이클로 연다.
