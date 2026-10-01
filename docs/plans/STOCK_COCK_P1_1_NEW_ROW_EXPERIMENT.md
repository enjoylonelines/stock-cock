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
| selected | 2 | 2 | 20 | 기존 행 보강만으로는 신규 행 경쟁 미해결 |
| advisory-lock test candidate | 1 | 2 | 20 | 두 원장은 보존하면서 한 행으로 합산 |

증거: `tests/inventory/results/p1-new-row-v2.json`. 재현 러너: `tests/inventory/p1_new_row.py`.

## 결정 및 반영 상태

1. 첫 입고 동시 요청은 모두 커밋하고 한 재고 행에 합산한다.
2. 기존 중복 행은 자동 정리하지 않고, 중복이 있으면 migration을 중단한다.
3. 일반 입출고는 음수를 허용하지 않는다. 조정/재계산은 별도 writer 정책으로 남긴다.

정책 구현: `20260924000000_enforce_inventory_pair_policy.sql`. 정책 적용 결과는 `tests/inventory/results/p1-new-row-policy.json`에 있다.

## 후속 규칙

- 합산 정책은 pair unique invariant와 advisory lock으로 제품 migration에 반영했고, 기존 회귀 + P1.1 재검증을 통과했다.
- 거절을 선택하면 명시적 conflict SQLSTATE와 원장 rollback 계약을 정하고 같은 workload에서 한 건만 커밋되는지 검증한다.
- 두 경우 모두 기존 중복 데이터 정책을 먼저 정하지 않으면 unique constraint를 제품에 적용하지 않는다.

## 비범위

자동 retry/idempotency, `moves`·`adjustments`·직접 DML writer, 실제 Next 세션 인증, 처리량 우위 비교는 이 실험에서 결론내리지 않는다.
