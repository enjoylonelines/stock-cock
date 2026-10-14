# Stock-Cock 동일 idempotency key 동시 재시도 정합성

## Problem framing

- Observed problem: 단일 전표의 순차 create/approve 재시도는 검증됐지만, 같은 requester와 idempotency key로 들어오는 100개의 동시 판매 요청 및 승인 재시도의 결과는 측정되지 않았다.
- Human hypothesis: `unrecorded`.
- AI challenger hypothesis: `(requester_id, idempotency_key)` unique constraint와 전표 잠금이 경쟁 상황에서도 하나의 문서·거래·미수금 projection만 남긴다.
- Prediction: 동일 key 판매 생성 100건은 하나의 document ID만 반환하고, 최초 생성 1건과 idempotent replay 99건으로 끝난다. 이어지는 동일 문서 승인 100건은 하나의 transaction·projection만 만들며 1건만 non-replay 응답이다.
- Stop condition / Budget: synthetic single SKU·single warehouse·single requester/approver, create 100 + approve 100 RPC를 각 phase별 한 번 실행한다. 서로 다른 주문의 재고 경쟁, HTTP/session, outbox, 장애 복구는 제외한다.
- Falsification condition: null 또는 서로 다른 document ID, duplicate document/line/audit/transaction/projection, 재고 delta 불일치, 예상 밖 SQL 오류, 또는 worker barrier 해제 뒤 DB wait 관찰 부재.
- Decision required: 이 isolated concurrent retry 결과를 “동일 요청 중복 반영 방지” 근거로 채택할지 여부.

## Discriminating experiment

- Fixture/workload: initial stock 10; 판매 수량 1·금액 100·동일 idempotency key의 create 100건, 이후 그 단일 문서의 approve 100건.
- Metrics: unique returned document IDs, first/replay/error count, lock wait count, unique transaction/projection/audit counts, final stock, create/approve internal RPC p50/p95.
- Adoption/rejection gate: document 1, line 1, create audit 1; create `1/99/0`; approve `1/99/0`; transaction/projection/approved audit each 1; final stock 9.

## Outcome

- Evidence: `docs/evidence/2026-10-14-stock-cock-concurrent-idempotency.md`; create와 approve의 100-worker gate 모두 adoption gate를 통과했다. 생성은 first/replay/error `1/99/0`, 승인은 `1/99/0`, document/transaction/projection/approved audit 각각 1건, final stock 9였다.
- Human decision: pending.
- Changed belief: 지정한 synthetic DB 동시 재시도에서 동일 key의 중복 문서·중복 재고 반영·중복 미수금 projection은 관찰되지 않았다.
- Limitations: DB RPC-level retry only; it does not establish HTTP request deduplication, client retry policy, cross-region behavior, or crash recovery.
