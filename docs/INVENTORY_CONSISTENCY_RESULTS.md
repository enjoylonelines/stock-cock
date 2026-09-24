# 재고관리 정합성 보강 결과

2026-09-23 · 브랜치 `fix/inventory-transaction-consistency`
상태: **기존 행 입출고 RPC 보강 구현·제한된 재검증 완료. 운영 배포 없음.**
원본 baseline: `239eb461611729f34ebb9ae345b5054e0d3e0255`.
계획: [보강 계획](plans/STOCK_COCK_CONSISTENCY_REINFORCEMENT_PLAN.md).
재현: [시험 README](../tests/inventory/README.md), [원시 결과](../tests/inventory/results).

## 문제와 선택

원본 RPC는 재고를 읽고 계산한 절대값으로 갱신했다. 두 입고가 성공해도 일부 증감이 누락됐고, 잔량1에 출고2건이 성공하여 원장 불일치 또는 음수가 발생했다.
실제 저장소의13개 migration을 모두 재생한 시험 DB에서도 반례를 재현했다.

A: FOR UPDATE 후 계산 / B: 현재 DB 값에 원자 증감과 출고 잔량 조건을 적용하는 두 후보를 비교했다.
각 후보 count/g × 입고·출고·batch 오류 6trial씩 실패0·중첩 coverage 누락0.
B를 선택했다. stale 절대값 계산을 제거하고 출고 조건을 변경문과 함께 표현할 수 있어서다. 작은 표본으로 성능 우월성을 주장하지 않는다.
후보는 시험용이고 **제품에는 B만** 적용했다. 선택 후 제품 SQL의 추가 개선 루프는 없었다.

## 실제 변경

- 새 migration `20260923000000_guard_inventory_transactions.sql`: 기존 행의 quantity/g를 현재 DB 값으로 증감하고 잔량 부족 시 예외로 거래 전체 rollback.
- SKU UUID 순서로 품목 처리; 중복 SKU 요청 거절. DB 상품 유형(company/franchise/pb/material)을 기준으로 단위 확인, 완제품 소수 수량 보존.
- g는 양의 정수 및 int 범위 검증. 기존 UI가 소수 g를 보내기도 하므로 이는 명시적 계약 강화다.
- 없는 재고 출고 거절; 정상 신규 입고 유지. 신규 행 동시 생성 보호를 추가한 것은 아니다.
- 오염된 재고(중복 행/음수/활성열 NULL/비활성 단위 잔량)는 조용히 보정하지 않고 오류 처리.
- API: 재고 부족409/INSUFFICIENT_STOCK, 없는 재고409/INVENTORY_NOT_FOUND, SQL 입력 오류400. 기술 오류는 업무 거절로 분류하지 않고 자동 재시도도 추가하지 않음.
- 성공 응답 형식/RPC 시그니처는 유지. 관련 route 회귀 및 Python DB 시험 도구 추가.

## 검증 결과

| 검증 | 원본 | 선택안 |
|---|---|---|
| 후보 비교 C1/C2/C4 count/g 각1회 | 6trial 중4 정합성 실패 | A6/B6 모두 실패0 |
| 동일8조건 ×3회 재검증 | 24trial 중17 정합성 실패 | 24trial 실패0 |
| 별도 C0/C3/C4/C5 count/g 경계 | 8trial 중4 실패 | 8trial 실패0·coverage 누락0 |
| 입력/단위/헤더/rollback 회귀 | 새로운 계약 확인 대상 | 27case 실패0 |
| route·관련 단위 테스트 | 과거 전체 통과 주장 없음 | 46pass·기존3skip |
| 실제 SDK→PostgREST→DB | 해당 비교 미실행 | 3case pass |
| migration | 원본13개 replay | clean14개·upgrade·복구/재적용 확인 |
| TypeScript | — | tsc --noEmit 통과 |

각 항목은 목적이 달라 단순 합산 실패율을 만들지 않는다. 개별 trial은2요청이며 stress/포화점 탐색은 없다.
원본/선택안 재검증에서 각각 자연 스케줄2trial(C1/count1회, C2/count1회)은 active 중첩을 포착하지 못했다.
**선택안24건의 정합성 결과와 동시성 coverage는 별개**다. 이2건을 입증된 동시 실행으로 세지 않는다.
gate trial은 해제 전 두 worker의 blocking chain을 확인했다. 내부 SELECT 시각·자연 발생 확률은 주장하지 않는다.

입고는100+10+20=130, 잔량1의 두 출고는 정확히1commit·1부족 거절·최종0으로 확인됐다.
재고 부족 batch와 실제 FK 오류 모두 첫 품목 변경 뒤 전체 rollback을 확인했다.
C4 invalid option은 정렬 후 마지막에 처리되며 명시적23503을 낸다. 이것만 FK 엔진 시험으로 포장하지 않고, 별도 test-only trigger에서 실제 FK23503을 발생시킨 count/g 시험을 추가했다. 제품 trigger 추가 없음.
원장 헤더 user/supplier/created_at/창고 방향/응답 transaction id 및 품목 증감도 회귀에서 대조했다.

초기 추가 회귀의 NaN 사례는 Python Decimal NaN의 자기불일치 때문에 검사기가 상태 변경으로 오판했다.
SQL은 예상 P0003을 반환했고 전후 원시 snapshot은 동일했다. 검사기 비교만 수정한 후27건을 재확인했다.
초기 `regression.json`과 수정 후 `regression-verified.json`을 함께 보존했다.

## 환경·migration·API 경계

고정 test DB localhost55439, PG17.11/READ COMMITTED, CPU1/512MiB/max connections12.
실제13개 migration과 pg_cron1.6을 설치했고 cron 실행은 비활성화했다.
auth.users/auth.uid/storage.objects는 stub이다. 운영 RLS/세션 인증·스토리지 구현과 동등하지 않다.
원본→신규 함수 upgrade는 기존 재고 데이터 보존, 원본 함수 복구 후 재적용 동일성, 빈 스키마에서14개 전체 설치 동일성을 확인했다.
clean 설치 후 count C0/C2 및 g C2 smoke도 통과했다. 복구 SQL을 운영에 적용한 것은 아니며 원본 복구는 알려진 결함을 되돌린다.
catalog·index·RLS policy·extension·함수 ACL은 `migration-verify.json`에 보존했다.

API 통합은 실제 route 함수를 프로세스 안에서 호출하고 real Supabase JS→HTTP PostgREST→PG를 거쳤다.
성공200·출고 후 재출고409·없는 공급자 FK500과 각 DB 효과를 확인했다.
서버 client factory/알림은 시험 대체이며 실제 Next HTTP 서버·cookie session auth·Supabase gateway는 미검증이다.
알림은 외부 전송하지 않았다. 제품의 commit 뒤 알림 await/응답 유실 문제를 해결한 것은 아니다.

Ontology 작업과 같은 호스트를 사용했다. 별도 컨테이너/포트를 쓰고 소수 correctness만 시험했다.
관측 오버헤드·공유 자원·임의 UUID fixture가 있어 p95/TPS/성능 개선율을 제시하지 않는다.

## 남은 한계와 종료

### 2026-09-24 Product DoD 회귀

기존 `tests/inventory/api.integration.test.ts`를 전용 PostgREST/PG 환경에서 다시 실행했다. 3건 모두 통과했다.

- 정상 입고: HTTP 200, `transaction_id`와 transaction item 일치, 재고 1→3, 알림 1회
- 부족 출고: HTTP 409 `INSUFFICIENT_STOCK`, 실패 거래 원장 0건, 재고 snapshot 불변, 알림 없음
- 공급자 FK 오류: HTTP 500/`23503`, 재고·거래 원장 불변, 알림 없음

원시 결과: `tests/inventory/results/api-integration-9b776d3e-4ede-4677-b108-08350d5633c3.json`.
이 결과는 in-process route handler + Supabase JS/PostgREST/PG 경로다. 실제 Next HTTP 서버, cookie session 인증, 운영 gateway까지 검증한 결과로 확대하지 않는다.

### 2026-09-24 신규 행 정책 반영

정책을 `동시 첫 입고는 모두 커밋하고 한 행에 합산`, `기존 중복은 자동 정리하지 않고 migration 중단`, `일반 출고 음수 금지`로 확정하고 `20260924000000_enforce_inventory_pair_policy.sql`에 반영했다. migration은 먼저 중복 진단 DO block을 실행한 뒤 `(product_option_id, warehouse_id)` unique index를 만들고, RPC의 missing-row 판단 앞에 pair별 transaction advisory lock을 건다.

P1.1 결과는 baseline 2행, selected 2행, policy 1행·2건 원장·최종20으로 확인됐다. clean replay와 upgrade/restore/reapply 검증은 `tests/inventory/results/migration-verify-p1-v11.json`, 정책 P1.1 결과는 `tests/inventory/results/p1-new-row-policy.json`에 보존했다.

이번 보장은 **기존 재고 행에 대한 입출고 RPC끼리**다.
신규 행 경쟁, moves/adjustments/recalculate/직접 DML과의 경쟁, 운영 데이터 drift, 멱등성/응답 유실/자동 retry는 미해결이다.
없는 행에 pair UNIQUE/upsert를 추가하거나 글로벌 CHECK를 도입하지 않았다.
기존 데이터의 음수/중복/단위 오염을 임의 정리하지 않는다. 운영 적용 전 데이터·권한·실제 API 경로 확인은 별도 gate다.
REST API 전체/운영배포 준비까지 무조건 완료한 것으로 해석하지 않는다.

질문에 대한 반례→두 대안 비교→한 전략 적용→동일 workload 재검증과 제한을 확보했으므로 **이번 개선 사이클을 종료**한다.
Redis/Kafka/Queue/서버 분리/새 CI/CD/관측 플랫폼은 도입하지 않았다.
