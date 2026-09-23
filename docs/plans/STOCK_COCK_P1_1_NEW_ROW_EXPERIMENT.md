# P1.1 신규 재고 행 경쟁 실험

## 목적

기존 `create_transaction` 보강이 이미 존재하는 재고 행의 동시 입출고를 다루는지와 별개로, 같은 SKU·창고에 첫 입고가 동시에 들어올 때 현재 구현의 한계를 측정한다. 제품 migration은 이 실험 결과와 제품 의미 결정 전에는 적용하지 않는다.

## 측정 범위

- 동일 `product_option_id`·`warehouse_id`에 재고 행이 없는 상태
- 두 클라이언트가 동시에 `in +10` 요청
- 요청 겹침, 생성된 inventory 행 수, 최종 합계, transaction/transaction_items 보존 여부
- baseline, 현재 selected migration, advisory-lock test candidate 비교

## 결과

| variant | inventory rows | transactions | ledger quantity | 판정 |
|---|---:|---:|---:|---|
| baseline | 2 | 2 | 20 | 중복 행 생성. 원장 합계와 재고 합계는 일치하지만 단일 행 invariant 미보장 |
| selected | 2 | 2 | 20 | 기존 보강만으로 신규 행 경쟁은 해결되지 않음 |
| advisory-lock test candidate | 1 | 2 | 20 | 두 원장은 보존하면서 한 행으로 합산 |

증거: `tests/inventory/results/p1-new-row-v2.json`. 재현 러너: `tests/inventory/p1_new_row.py`.

## 아직 사용자가 결정할 것

1. 첫 입고 동시 요청은 한 재고 행에 합산하는가, 아니면 한 요청을 충돌로 거절하는가.
2. 이미 중복 행이 존재하는 운영 데이터는 배포 전에 정리할 것인가, migration을 오류로 중단할 것인가.
3. 조정/재계산 경로에서 음수 재고를 허용할 것인가.

## 후속 규칙

- 합산을 선택하면 pair unique invariant와 conflict-safe insert 또는 advisory lock 중 하나를 제품 migration 후보로 구현하고, 기존 27개 회귀 + P1.1 반복 실험을 다시 통과시킨다.
- 거절을 선택하면 명시적 conflict SQLSTATE와 원장 rollback 계약을 정하고 같은 workload에서 한 건만 커밋되는지 검증한다.
- 두 경우 모두 기존 중복 데이터 정책을 먼저 정하지 않으면 unique constraint를 제품에 적용하지 않는다.

## 비범위

자동 retry/idempotency, `moves`·`adjustments`·직접 DML writer, 실제 Next 세션 인증, 처리량 우위 비교는 이 실험에서 결론내리지 않는다.
