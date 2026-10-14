# Stock-Cock DD-A1 — 승인 전표·동시성 결과 요약

## Why this Deep Dive exists

Stock-Cock은 식품 제조 현장의 재고 불일치를 줄이기 위해 만든 서비스다. 당시 ERP 연동 요구는 남았지만 핵심 재고 운영을 우선하면서 완료하지 못했다. 이 Deep Dive는 그 미해결 요구를 새 기능 목록으로 바꾸는 대신, ERP 업무가 재고 변경과 결합될 때 어떤 불변식을 DB 구조로 보장할 수 있는지 검증한다.

ECOUNT Open API 연동이나 실제 회계 ERP 완성이 목적은 아니다. 이 결과는 ECOUNT 같은 ERP 제품 개발 관점의 DD-A1, 즉 전표 → 원장 → 현재고의 업무 경계를 설명하기 위한 bounded evidence다.

## Design choice under test

판매 출고를 직접 재고 수정으로 처리하지 않고 `DRAFT → PENDING_APPROVAL → REFLECTED` 승인 전표로 만든다. `REFLECTED` 전환은 기존 canonical `create_transaction()`을 호출하고, 판매 전표에는 동일 DB transaction에서 하나의 미수금 projection을 만든다.

보장하려는 불변식은 다음이다.

1. 재고가 음수가 되지 않는다.
2. 같은 업무 요청의 재시도는 문서·거래·미수금을 중복 생성하지 않는다.
3. 반영된 판매 전표 하나는 canonical 재고 거래 하나와 미수금 projection 하나를 가진다.
4. 부족 재고 거절은 어느 결과도 부분 반영하지 않는다.

## Executed evidence

| Experiment | Result | What it establishes |
| --- | --- | --- |
| 승인 전표 lifecycle 회귀 | 8 checks pass | draft/submit은 비반영, 권한·self-approval guard, 취소/반려, 판매 projection, 부족 재고 rollback |
| 동일 SKU 판매 승인 100건 | 50 reflected / 50 `INSUFFICIENT_STOCK` / unexpected 0 | 초기 재고 50에서 음수 없이 가용 재고만 반영; transaction/projection 각 50 |
| 동일 idempotency key 생성 100건 | first/replay/error = 1/99/0 | 문서·line·`CREATED` audit 각각 1 |
| 동일 전표 승인 재시도 100건 | first/replay/error = 1/99/0 | transaction·projection·`APPROVED_AND_REFLECTED` audit 각각 1; 재고 10 → 9 |

두 동시성 실험은 모두 disposable PostgreSQL에서 100개의 독립 연결을 barrier로 해제하고 DB lock wait를 관찰했다. 상세 원시 실행 기록은 다음에 있다.

- `docs/evidence/2026-10-14-stock-cock-concurrent-sales-correctness.md`
- `docs/evidence/2026-10-14-stock-cock-concurrent-idempotency.md`

## What this does not establish

- HTTP/API 처리량, 서비스 connection pool, 배포 환경의 latency SLO
- outbox, process crash/restart, retry lease, 외부 ERP import 또는 API 연동
- 반품·역분개·창고 이동을 이 승인 전표 흐름으로 완결하는 범위
- 세금, 결제/수금, 실제 회계 분개, customer master
- 실제 사용자 수·사용 빈도·운영 개선 효과

## Decision

DD-A1의 이번 단위는 **완료**로 둔다. 현재 증거는 승인 전표/원장/현재고/판매 미수금의 핵심 정합성과 동시 재시도 방지를 설명하기에 충분하다. outbox 또는 외부 연동을 Stock-Cock 본 서비스에 바로 추가하지 않는다.

다음 확장은 다음 중 하나의 별도 질문과 사전 정의된 실패 주입·대사 기준이 있을 때만 시작한다.

1. 외부 시스템 전달 실패를 견디는 durable interface event가 실제로 필요한가.
2. 대량 조회·집계에서 SQL/index/projection 중 무엇이 병목인가.
3. 반품·이동·역분개까지 동일 전표 모델로 확장해야 하는가.
