# Stock-Cock 직접 재고 반영과 승인 전표 재시도 A/B 실행 기록

## Scope

이 기록은 이전 transaction form이 호출하던 direct transaction RPC contract와 현재 same-key approval document contract를 같은 disposable PostgreSQL 환경에서 비교한다. 100개의 동일 logical sale 재시도가 실제로 남기는 거래 수와 재고 차감 수를 비교하며, API latency·HTTP 처리량·운영 사용자 행동은 비교하지 않는다.

## Baseline definition

이전 form은 `/api/transactions`에 `TransactionInput`을 POST했고, 요청 식별자 없이 direct transaction을 생성했다. 이 A/B의 direct arm은 그 underlying `create_transaction()` RPC에 같은 `out` payload를 100개의 독립 연결에서 동시에 보낸다. historical Next.js server를 boot한 실험은 아니지만, direct writer contract에 idempotency key가 없다는 핵심 차이를 동일 DB writer에서 분리한다.

## Environment and command

- Checkout: local `main` at `954b5f8` plus uncommitted A/B harness.
- Database: `tests/inventory/compose.yaml`의 PostgreSQL 17 disposable DB (`127.0.0.1:55439`), synthetic UUID fixture.
- Setup: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/run.py setup --output /tmp/stock-cock-ab-setup-20261014.json`
- Execution: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/direct_vs_approved_retry_ab.py --output /tmp/stock-cock-direct-vs-approved-retry-20261014-final.json`
- Raw result: `/tmp/stock-cock-direct-vs-approved-retry-20261014-final.json` (host-temporary; durable repository artifact는 아님).

## Result

두 arm 모두 초기 재고 100, 단일 SKU·창고·거래 상대, 수량 1의 동일 logical sale 100회 조건이다.

| Metric | Direct transaction arm | Same-key approval document arm |
| --- | ---: | ---: |
| transaction writes | 100 | 1 |
| stock decrements | 100 | 1 |
| duplicate applied writes | 99 | 0 |
| document count | n/a | 1 |
| receivable projections | n/a | 1 |
| unexpected errors | 0 | 0 |

따라서 이 fixed workload에서 transaction write 수는 `100 → 1`(99% 감소), duplicate applied write는 `99 → 0`(100% 제거)였다. 현재 arm의 100개 승인 호출은 최초 반영 1건과 idempotent replay 99건으로 끝났다.

## Interpretation and limits

이 결과는 direct writer 자체가 음수 재고를 만들었다는 뜻이 아니다. 충분한 초기 재고에서 동일 logical request를 100번 보내면 request identity가 없는 direct path는 100건을 모두 독립 업무로 처리한다는 뜻이다. 현재 전표 흐름은 그 특정 중복 재시도 위험을 제거한다.

이것은 DB contract A/B이며 과거 배포 artifact, browser session, HTTP/API performance, 외부 ERP integration, crash recovery를 비교한 결과가 아니다. 포트폴리오에는 `100 → 1` transaction writes와 `99 → 0` duplicate applied writes를 이 범위와 함께 사용한다.
