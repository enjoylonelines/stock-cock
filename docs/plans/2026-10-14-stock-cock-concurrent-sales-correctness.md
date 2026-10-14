# Stock-Cock 동일 SKU 100건 동시 판매 정합성

## Problem framing

- Observed problem: 단일 판매 전표의 재고·미수금 1:1은 검증됐지만, 여러 승인자가 아닌 하나의 승인자 프로세스에서 같은 SKU 판매 전표 100건이 경쟁할 때의 최종 정합성은 측정되지 않았다.
- Human hypothesis: `unrecorded`.
- AI challenger hypothesis: canonical `create_transaction()`의 SKU/창고 advisory lock 및 잔량 조건이 승인 전표를 통해서도 유지되면, 초기 재고 50에서 수량 1의 판매 100건은 정확히 50건만 반영된다.
- Prediction: 100개 승인 RPC를 같은 SKU에 gate-controlled overlap으로 해제하면 성공 50, `INSUFFICIENT_STOCK` 50, 최종 재고 0, 추가 거래 50, 추가 미수금 projection 50이 된다.
- Stop condition / Budget: synthetic single SKU·single warehouse·single counterparty, 100개 승인 RPC 1회. throughput, multi-process service recovery, external API, payment, outbox는 제외한다.
- Falsification condition: 음수 재고, 성공/거래/projection 수 불일치, 예상 밖 SQL 오류, 또는 100개 독립 worker의 barrier 해제 뒤 DB lock wait 관찰 부재.
- Decision required: 이 isolated, gate-controlled result를 portfolio의 "동일 SKU 100건 경쟁 조건" 근거로 채택할지 여부.
- Unknowns: 운영 트래픽 분포, connection pool, HTTP/session 레이어, 다중 writer·이동·조정과의 경쟁.

## Alternatives

- Baseline: 단일 전표 lifecycle만 회귀한다.
- Challenger: 동일 SKU 판매 전표 100건을 독립 연결에서 동시에 승인하고, DB 대기 관찰 뒤 해제한다.
- Invariants: successful approval 하나당 transaction/projection 하나; 부족 거절은 둘 다 없음; final stock is non-negative.

## Discriminating experiment

- Fixture/workload: initial stock 50, 100 distinct sale documents of quantity 1 and amount 100, same SKU/warehouse/counterparty.
- Metrics: success/rejection/technical-error count, 100-worker barrier release와 DB lock wait, final stock, transaction and projection deltas, duplicated document IDs.
- Adoption/rejection gate: `50/50/0`, 100 worker barrier release와 lock wait observed, stock `0`, transaction delta `50`, projection delta `50`.

## Outcome

- Evidence: `docs/evidence/2026-10-14-stock-cock-concurrent-sales-correctness.md`; the disposable-DB experiment passed its adoption gate (50 reflected, 50 insufficient-stock rejections, zero technical errors, zero final stock, 50 transaction/projection deltas). `pg_stat_activity` observed 12 active workers waiting on a DB lock after the 100-worker barrier release.
- Human decision: pending.
- Changed belief: this bounded database path has direct evidence that the canonical writer prevents negative stock during the specified same-SKU race.
- Limitations: a test-only gate establishes DB overlap but not production concurrency, HTTP capacity, latency, or recovery behavior.
