# Stock-Cock direct write versus approved idempotent retry A/B

## Problem framing

- Observed problem: 이전 transaction form은 `/api/transactions`로 동일 payload를 직접 제출했고 request identity가 없었다. 현재 approval document 흐름의 중복 방지 효과를 before/after 수치로 제시한 적은 없다.
- Human hypothesis: `unrecorded`.
- AI challenger hypothesis: 같은 logical sale을 100번 재시도하면 legacy direct path는 100개의 재고 거래를 남기지만, same-key approval path는 문서·거래·미수금 projection을 각각 하나만 남긴다.
- Prediction: 충분한 초기 재고 100에서 direct path의 transaction count/stock decrement는 `100/100`, current path는 `1/1`; duplicate applied writes는 `99 → 0`이다.
- Stop condition / Budget: disposable DB, single SKU/warehouse/counterparty, 100 concurrent equivalent requests per path. 이 실험은 historical Next.js runtime을 boot하지 않고 이전 form이 호출하던 direct RPC contract를 같은 writer에서 재현한다.
- Falsification condition: direct path가 100개의 거래를 남기지 않거나, current path가 document/transaction/projection 어느 하나든 1개를 초과하거나, final stock이 각각 `0/99`와 다르거나, technical error가 발생한다.

## Metrics and interpretation

- `transaction writes`: direct `100` versus current `1`; 99% reduction in writes for the same logical request retries.
- `duplicate applied writes`: direct `99` versus current `0`; 100% elimination in this bounded workload.
- This is a correctness A/B, not a production throughput, latency, or end-to-end HTTP comparison.

## Outcome

- Evidence: `docs/evidence/2026-10-14-stock-cock-direct-vs-approved-retry-ab.md`; direct/current 경로가 예측한 `100/1` transaction write와 `99/0` duplicate applied write를 보였다.
- Human decision: pending.
