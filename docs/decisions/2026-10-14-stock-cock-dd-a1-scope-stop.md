# DD-A1 scope stop — approval and concurrency evidence

## Decision

승인 전표의 판매 출고·미수금 projection과 두 개의 100-worker DB concurrency experiment까지만 이번 DD-A1 보강 범위로 채택한다. outbox, 외부 ERP API, durable restart recovery, 대량 조회 최적화는 다음 문제 정의 없이 추가하지 않는다.

## Evidence

- `docs/evidence/2026-10-14-stock-cock-sales-receivable-slice.md`
- `docs/evidence/2026-10-14-stock-cock-concurrent-sales-correctness.md`
- `docs/evidence/2026-10-14-stock-cock-concurrent-idempotency.md`
- `docs/evidence/2026-10-14-stock-cock-dd-a1-approval-and-concurrency.md`

## Rationale

원래 Deep Dive는 ERP를 완성하거나 ECOUNT API를 연동하는 일이 아니라, 실제로 남았던 ERP 연계 문제를 전표·원장·현재고의 정합성 관점에서 검증하는 일이었다. 지금 결과는 이 bounded question에 직접 답한다. 현재 사용자 수와 운영 규모에서 추가 queue/outbox를 본 서비스에 넣는 것은 아직 측정된 필요가 아니라 복잡성만 늘릴 가능성이 크다.

## Human decision gate

후속 확장은 외부 전달 실패, 대규모 조회 병목, 또는 반품/이동/역분개 중 하나가 실제 검증 질문으로 채택될 때만 시작한다. 그때는 workload, failure injection, reconciliation acceptance, stop condition을 먼저 기록한다.
