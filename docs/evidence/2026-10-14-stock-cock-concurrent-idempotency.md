# Stock-Cock 동일 idempotency key 100건 동시 재시도 실행 기록

## Scope

이 기록은 disposable PostgreSQL에서 동일 requester와 idempotency key로 동시에 들어온 판매 생성·승인 재시도가 문서, 재고 거래, 미수금 projection을 한 번만 남기는지 확인한 결과다. HTTP request deduplication, client retry policy, outbox·재시작 복구, 외부 ERP import, 운영 데이터는 범위 밖이다.

## Environment and command

- Checkout: local `main` at `dd6c5a1` plus uncommitted concurrency harnesses.
- Database: `tests/inventory/compose.yaml`의 PostgreSQL 17 disposable DB (`127.0.0.1:55439`), synthetic UUID fixture; test-only `max_connections=128`.
- Setup: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/run.py setup --output /tmp/stock-cock-idempotency-setup-20261014.json`
- Execution: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/idempotency_concurrency.py --output /tmp/stock-cock-idempotency-concurrency-20261014-final.json`
- Raw result: `/tmp/stock-cock-idempotency-concurrency-20261014-final.json` (host-temporary; durable repository artifact는 아님).

## Workload and result

- 초기 재고 10에서 동일 SKU·창고·거래 상대, 수량 1·금액 100·동일 idempotency key의 판매 생성 RPC 100개를 독립 PostgreSQL 연결에서 barrier로 동시에 해제했다.
- 생성 결과는 최초 생성 1건, idempotent replay 99건, 오류 0건이었다. unique document ID 1개, line 1개, `CREATED` audit 1개를 확인했다. 생성 phase의 `pg_stat_activity` snapshot에는 lock 대기 worker 42개가 있었다.
- 단일 문서를 제출한 뒤 승인 RPC 100개를 독립 연결에서 동시에 해제했다.
- 승인 결과는 최초 반영 1건, idempotent replay 99건, 오류 0건이었다. unique transaction ID 1개, sales receivable projection 1개, `APPROVED_AND_REFLECTED` audit 1개, 최종 재고 9를 확인했다. 승인 phase에서는 lock 대기 worker 80개가 관찰됐다.

## Internal timing (not an API SLO)

| Phase | p50 | p95 | max |
| --- | ---: | ---: | ---: |
| create RPC | 358ms | 455ms | 459ms |
| approve RPC | 172ms | 277ms | 280ms |

시간은 localhost disposable DB의 RPC 호출 구간이며, 100개 thread와 테스트 환경의 lock 경쟁을 포함한다. HTTP, 인증, connection pool, 서비스 큐잉, 운영 인프라를 포함하지 않으므로 API p50/p95 또는 운영 SLO로 해석하면 안 된다.

## Interpretation and limits

지정한 synthetic DB 경쟁에서 동일 key 재시도는 문서와 후속 반영을 정확히 한 번만 남겼다. 이는 서로 다른 SKU 주문 경쟁, 장애 후 재처리, outbox, 보고서 read model 지연, 실계정·결제·세금이나 외부 연동의 신뢰성 근거는 아니다.

Human decision: pending.
