# STOCK_COCK 한계 검증 계획

작성일: 2026-09-24  
기준 브랜치: `inventory-consistency-reinforcement` @ `b47d798`

현재 정책 migration은 `create_transaction` RPC에 대해 다음을 보장한다.

- 같은 SKU·창고의 첫 입고 요청은 모두 커밋하고 한 inventory 행에 합산한다.
- 기존 중복 행이 있으면 자동 정리하지 않고 migration을 중단한다.
- 일반 입출고는 음수 재고를 허용하지 않는다.

이제 검증할 것은 이 정책의 확장이 아니라 **현재 보장의 한계**다.

## 우선순위

### L0 — migration 데이터 gate

중복 inventory fixture를 만든 뒤 정책 migration이 명시적 오류로 중단되는지 확인한다.

완료 기준:

- 중복 행을 조용히 합치지 않음
- unique index가 부분적으로 남지 않음
- 정리된 DB에서는 clean replay가 통과함

### L1 — hot SKU 경합 한계

동일 SKU·창고에 대해 worker 수를 2, 8, 32, 64로 늘려 기존 행 입출고와 첫 입고를 각각 실행한다.

측정:

- 성공·업무 거절·기술 오류·unknown 건수
- 정합성 실패와 원장 불일치
- p50/p95/p99 RPC latency
- advisory lock wait와 transaction wait
- connection pool 고갈, timeout, deadlock
- 첫 입고 후 inventory 행 수와 원장 합계

판정:

- 정합성 실패 1건이면 correctness 실패
- timeout/deadlock은 성공이나 업무 거절로 집계하지 않음
- p95/TPS는 이 workload와 자원 조건 안에서만 보고
- 특정 worker 수에서 포화가 발생하면 그 지점을 현재 한계로 기록하고 queue 도입을 자동 결정하지 않음

초기 bounded 실행 결과(`tests/inventory/results/limits-p1-v5.json`):

| workers | successes | errors | final quantity | p95 ms |
|---:|---:|---:|---:|---:|
| 2 | 2 | 0 | 102 | 5.84 |
| 4 | 4 | 0 | 104 | 9.67 |
| 8 | 8 | 0 | 108 | 16.45 |

이 표본에서는 정합성 실패·기술 오류 없이 advisory lock 대기 시간이 worker 수와 함께 증가했다. 이는 포화점이나 운영 TPS가 아니며, CPU 1·max connections 12의 격리 DB에서 얻은 한계 관측이다.

### L1 — 다른 writer 경계

실제 저장소에서 `moves`, `adjustments`, `recalculate`, 직접 inventory DML 경로를 식별한 뒤, 존재하는 writer만 대상으로 동시 실행한다.

검증 질문:

- `create_transaction`의 unique/advisory 정책을 우회하는 writer가 있는가
- 같은 SKU·창고를 절대값으로 덮어쓰는 writer가 있는가
- 거래 원장 없이 재고만 변경되는 경로가 있는가
- 전역 invariant를 주장하려면 어떤 writer를 함께 보강해야 하는가

writer가 없거나 호출 경로가 확인되지 않으면 구현하지 않고 “미확인”으로 남긴다.

### L2 — 응답 유실과 retry

commit 직후 응답을 버리는 fault injection을 넣어 현재 API에 idempotency key가 없다는 사실을 측정한다.

완료 기준:

- 중복 거래가 발생할 수 있는 정확한 경계와 조건을 기록
- 자동 retry를 추가하지 않음
- 재시도 정책이 필요할 때 필요한 operation/attempt key와 unique 범위를 제안

### L2 — 운영 경계

실제 Next HTTP/session/gateway와 운영 데이터 drift는 별도 환경에서 검증한다. 현재 in-process route와 stub auth 결과를 운영 보장으로 확대하지 않는다.

### 교차 writer 결과

실제 `moves`/조정 계열이 사용하는 absolute read→write 패턴을 재현했다. 초기100에서 RPC `+1`과 stale writer `+5`를 교차 실행하면 최종 재고는105, 기대값은106이 되어 원장과 snapshot이 불일치했다. RPC 자체는 성공했고 별도 writer의 transaction 원장은 없었다. 증거는 `tests/inventory/results/limits-p1-v9.json`이다.

이는 현재 정책 migration의 실패가 아니라 **다른 writer가 advisory lock과 원자 증감을 우회하는 한계**다. 다른 writer를 같은 DB 함수 계약으로 통합하거나 전역 정합성을 포기한다는 정책 결정 없이는 자동 수정하지 않는다.

## 현재 판정

L0 duplicate gate는 예상대로 중복 데이터에서 `P0001 INVENTORY_DUPLICATES_EXIST`로 중단됐고 unique index를 남기지 않았다. L1 2/4/8 workers는 모두 원장과 재고 합계가 일치했다. 교차 writer에서는 stale absolute update 반례가 재현됐다. 따라서 현재 RPC 범위의 검증은 종료하고, 다른 writer를 통합할지 여부를 별도 결정한다.

## 종료 조건

L0을 통과하고 L1에서 정합성 반례와 포화 지점을 기록하면 이번 한계 검증 사이클을 종료한다. L2는 실제 배포나 retry 요구가 발생할 때 별도 사이클로 시작한다.

이번 사이클에서 자동 도입하지 않는 것:

- Kafka/Redis/queue
- 분산 lock 서비스
- 전역 CHECK
- 자동 retry/idempotency
- 다른 writer의 전면 재작성
