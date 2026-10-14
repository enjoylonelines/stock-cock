# Stock-Cock 동일 SKU 100건 동시 판매 정합성 실행 기록

## Scope

이 기록은 disposable PostgreSQL에서 같은 SKU의 판매 승인 100건이 경쟁할 때 승인 전표가 canonical inventory writer와 미수금 projection을 함께 일관되게 반영하는지 확인한 결과다. 외부 ERP API, HTTP/session 처리량, outbox·장애 복구, 실회계·세금·결제, 운영 데이터는 범위 밖이다.

## Environment and command

- Checkout: local `main` at `dd6c5a1` plus this uncommitted concurrency harness.
- Database: `tests/inventory/compose.yaml`의 PostgreSQL 17 disposable DB (`127.0.0.1:55439`), synthetic UUID fixture. 이 실험을 위해 테스트 DB 연결 상한만 128로 올렸다.
- Setup: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/run.py setup`
- Execution: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/sales_concurrency.py --output /tmp/stock-cock-sales-concurrency-20261014-final.json`
- Raw result: `/tmp/stock-cock-sales-concurrency-20261014-final.json` (host-temporary; durable repository artifact는 아님).

## Workload and result

- 초기 재고 50, 같은 SKU·창고·거래 상대에 대해 수량 1, 판매금액 100의 서로 다른 판매 전표 100건을 만들고 제출했다.
- 100개의 독립 PostgreSQL 연결을 barrier로 동시에 해제했다. row lock을 0.25초 동안 유지한 뒤 `pg_stat_activity`에서 lock 대기 worker 12개를 관찰했다.
- 성공 50건, `INSUFFICIENT_STOCK` 거절 50건, 예상 밖 기술 오류 0건이었다.
- 최종 재고는 `0`; transaction 증가분은 `50`; sales receivable projection 증가분은 `50`이었다.
- 전표 상태는 `REFLECTED` 50건, `PENDING_APPROVAL` 50건이었다. 즉 부족 재고 거절은 전표를 반영 상태로 바꾸거나 거래·미수금 projection을 만들지 않았다.

## Interpretation and limits

이 결과는 지정한 synthetic DB 경합에서 음수 재고 없이 정확히 가용 재고만 반영되고, 반영 1건마다 거래와 미수금 projection이 각각 하나씩 생긴다는 근거다. 단일 SKU·창고·거래 상대, 단일 DB, 테스트용 barrier의 결과이므로 운영 부하·지연 p50/p95, connection pool, 다중 writer, 장애 후 outbox 재처리·대사, 권한이 포함된 배포 세션, 실제 회계 보고서의 신뢰성 주장은 아직 할 수 없다.

Human decision: pending.
