# Stock-Cock 판매·미수금 최소 슬라이스

## Problem framing

- Observed problem: 현재 승인 전표는 `out` 승인 시 재고와 거래 이력만 기록한다. 판매 금액·거래처별 미수금은 기록하거나 재고 거래와 대조할 수 없다.
- Human hypothesis: `unrecorded`.
- AI challenger hypothesis: 승인 전표의 기존 `transaction_id`를 판매·미수금 projection의 고유 기준으로 삼으면, 별도의 재고 write 경로 없이 출고·매출·미수금의 1:1 대응을 검증할 수 있다.
- Prediction: 판매 출고 전표를 승인하면 재고는 한 번 감소하고, 같은 `transaction_id`를 참조하는 미수금 projection 한 건이 생성된다. 승인 재시도는 두 결과를 추가 생성하지 않는다.
- Stop condition / Budget: 단일 품목·단일 거래처·전액 미수 출고 한 경로와 disposable PostgreSQL 회귀까지. 실제 회계 분개, 세금, 결제, 부분 출고/수금, 외부 API, outbox는 포함하지 않는다.
- Falsification condition: 승인 재시도에서 재고 거래 또는 미수금 projection이 중복되거나, 부족 재고 실패 후 어느 한 쪽만 남으면 이 설계를 채택하지 않는다.
- Decision required: 이 slice의 거래처를 기존 `suppliers` 테이블로 재사용하는 임시 경계를 수용할지, 이후 별도 customer master를 도입할지.
- Unknowns: 실제 판매 단가 정책, 세금, 결제/수금, 고객 master 및 기존 운영 데이터의 `suppliers` 의미.

## Alternatives

- Baseline: `out` 전표 승인 시 재고 거래만 생성한다.
- Challenger: `out` 전표에 거래처와 판매 총액을 요구하고, 승인과 같은 DB transaction에서 `sales_receivable_projections`를 작성한다.
- Invariants: reflected 판매 전표 1건은 재고 거래 1건과 미수금 projection 1건을 가진다. 거절·취소·부족 재고에는 둘 다 없다.

## Discriminating experiment

- Fixture/workload: disposable PostgreSQL의 단일 품목·단일 거래처, 입고 후 판매 출고와 승인 재시도.
- Metrics: 거래 수, 미수금 projection 수, 잔량, 미수금 잔액, 재시도 뒤 중복 수.
- Adoption/rejection gate: 각 판매 전표에 대해 transaction/projection이 정확히 한 건이고 재고 잔량과 판매금액이 예상값과 일치한다.

## Outcome

- Evidence: `docs/evidence/2026-10-14-stock-cock-sales-receivable-slice.md`.
- Result: the bounded disposable-DB checks passed for one reflected sale → one canonical inventory transaction → one receivable projection, creation/approval replay, and insufficient-stock rollback.
- Human decision: pending.
- Changed belief: unrecorded.
- Limitations: 운영 회계·ERP 연동·Next.js session E2E·장애 복구·대규모 동시성은 증명하지 않는다.
- Stop condition met / Reason: yes for the predeclared single-item, single-counterparty, full-receivable database slice. Further expansion requires a new decision.
