> 실행 후속: 2026-09-23 기존 행 입출고 보강과 제한된 검증을 완료했다. 아래는 사전 계획이며 실제 결과·누락 범위는 [결과 보고서](../INVENTORY_CONSISTENCY_RESULTS.md)를 따른다.

# STOCK_COCK 정합성 보강 계획

작성일: 2026-09-23. 상태: 계획만 작성; 아래 개선·비교·재검증은 미실행.
기준: dev 239eb461611729f34ebb9ae345b5054e0d3e0255. 현재 checkout의 RPC/API와 clean 상태를 재확인했다.
선행 결과: /Users/hb/Projects/inventory/BASELINE_EXPERIMENT_REPORT.md.
이 문서는 기존 BASELINE_LIMITS_PLAN의 “실행 전” 상태 이후를 잇는 후속 계획이다.

## 2026-09-24 현재 상태와 두 STOP

현재 checkout은 `inventory-consistency-reinforcement`, HEAD `cb675b1`이며 검토 시작 시 clean이었다. `b763496`에 기존 행 보강, `cb675b1`에 신규 행 경쟁 실험이 있다. 아래 “미실행” 표현은 사전 계획의 기록이며 [실제 결과](../INVENTORY_CONSISTENCY_RESULTS.md)와 [P1.1 결과](STOCK_COCK_P1_1_NEW_ROW_EXPERIMENT.md)를 우선한다. 이번 검토에서는 DB/부하 시험을 다시 실행하지 않았다.

| 평가축 | 실제 근거 / 부족한 증거 |
|---|---|
| 문제정의/도메인 | 모바일 입출고→거래 이력→재고 확인; 동시 요청의 유실/초과 출고 반례 |
| 기술적 깊이 | 원본 full migration 재현, A/B 비교, 조건부 원자 증감·batch rollback, 독립 oracle; 신규 행 정책·다른 writer·응답 유실 경계는 별도 |
| 기술적 판단 | B 하나 선택, 일정한 품목 순서, 기능/인프라 확대 없이 종료; 작은 표본에서 속도 우월성은 입증하지 않음 |
| 검증 | 저장 기록의 24trial 전후·27case·SDK→PostgREST→DB 3case와 원시 결과; 24trial 중2개 자연 중첩 미포착, 운영 세션/전체 Next HTTP 재현 부족 |
| 제품 완성도 | 입출고 화면/API/RPC/오류 코드 구현; 실제 사용자 경로에서409 표시·재조회·재시도 안내의 수락 증거 |
| 운영 현실성 | full migration·격리 PG 시험; auth/storage stub, 운영 데이터 drift·배포 미검증 |
| Ownership/협업 | 계획/두 후보/선택/독립 oracle/commit 증거; 실사용자 수·피드백 및 본인/AI 기여는 별도 근거로 표기 |

Domain Reality는 현장 입출고를 수량과 거래 이력으로 함께 기록하는 업무다. Reframing은 “트랜잭션이면 안전하다”에서 **성공 응답·commit된 원장·잔량·업무 거절을 따로 대조한다**로 좁힌다. 실제 현장 사용 빈도·규모는 과거 자료의 검증 범위를 넘겨 주장하지 않는다.

**Product DoD / Product STOP:** 현재 slice는 기존 단일 SKU·창고 행에 대한 입출고다. 정상 요청→commit→화면 재조회·이력, 잔량 부족→409→부분 효과0·사용자 안내, 실패 후 재조회가 실행법과 시험으로 재현되어야 한다. 실제 Next session/HTTP 경로의 확인이 없으면 로컬 RPC/API 부분 완료로 남긴다. 운영 배포는 데이터·권한 gate가 별도이며, 전체 이동/조정 제품의 완료를 이 slice로 대체하지 않는다.

**Deep Dive 1개:** 기존 행 동시 mutation의 원장·재고·batch 정합성. source는 `20260923000000_guard_inventory_transactions.sql`과 관련 route, 검증은 `tests/inventory/`다. **Engineering STOP은 기존 보고 범위에서 도달**했다: 실패 재현→read-modify-write 원인→행 잠금/조건부 원자 갱신 비교→B 구현→동일 workload/실패 회귀→한계. fresh 재시험이나 대규모 latency 측정을 다시 요구하지 않는다.

**Vertical evidence와 다음 최소 검증:** baseline C1/C2 → MVCC/동시 UPDATE와 SQLSTATE/영향 행 의미 → 원장=초기+commit 증감·부족 거래 효과0 invariant → A/B → B → count/g·충돌·batch rollback → 원시 latency/lock 관측과 정확도. 실제 p95/처리량 우위는 미측정이다. 추가 vertical 작업은 제품에 남은 **UI/API 업무 오류 경계**에만 한정한다: 기존 부족 출고 fixture → route409/code → UI 표시와 재조회 → 원장/잔량 불변 확인. 새 DB 전략을 적용하는 두 번째 개선 loop가 아니다.

P1.1은 이미 “동시 첫 입고에서 selected도2행, advisory 시험후보는1행”을 보여줬다. 신규 행 합산/거절·기존 중복 데이터 처리·다른 writer 음수 정책이 결정되기 전에는 제품 migration에 반영하지 않는다. 이는 기존 행 Engineering STOP을 무효화하지 않는다.

Non-goal: queue/cache/분산락 플랫폼·자동 retry·전체 writer 정비·운영 부하. Expansion Trigger는 실제 신규 행 업무 요구와 데이터 정책 결정, 또는 현 scoped invariant를 깨는 반례다. **다음 실제 코드 작업 1개는 기존 재고 부족409 fixture를 사용자 입력→오류 표시→재조회까지 잇는 통합 회귀를 추가하는 것**이다. 사용자의 업무 정책이 없는 신규 행 수정부터 시작하지 않는다.

## Human-Owned / AI Delegation — 2026-09-24

| 영역 | Human-owned Knowledge / 판단 | AI 활용 | 검증 |
|---|---|---|---|
| 문제·도메인 | 입출고 성공·업무 거절·commit·원장과 잔량 관계 | 기존 코드/실험 증거 탐색 | 기존 행 범위와 다른 writer 한계 설명 |
| invariant | SKU/창고/active 단위별 final_stock = initial_stock + Σ(committed ledger delta); 거절 거래 효과0 | 원장 oracle·fixture·회귀 | 요청 성공 수와 commit·원장·잔량 독립 대조 |
| 구현 | 조건부 UPDATE의 현재 행/경쟁 대기, 영향 행·SQLSTATE·batch rollback | UI409 통합 회귀·반복/로그 | 작은 코드 변경의 lock/rollback 영향 예측 |
| 측정·주장 | overlap와 기술 오류/업무 거절 차이, 미관측 범위 | 표/문서 초안 | 합성 정확성 결과를 운영 TPS로 확대하지 않음 |

**Specification 초안(다음 UI 경계):** Problem=부족 출고409가 사용자 안내·재조회까지 이어지는 증거 부족. Constraint=기존 행/RPC 전략 유지·자동 retry 없음. Invariant=거절의 헤더/품목/stock 효과0, UI가 실패를 성공으로 표시하지 않음. Acceptance=입력→409/code→안내→재조회에서 DB 원장/잔량 불변과 정상 대조 통과. Failure=성공 표시·부분 반영·자동 중복 제출 또는 기술 오류를 업무 거절로 오인.

**핵심 코드/Defense:** `supabase/migrations/20260923000000_guard_inventory_transactions.sql`, 해당 API route의 SQLSTATE→409 변환, `tests/inventory/`의 oracle. 핵심 PostgreSQL 동작은 격리수준/동시 UPDATE·row lock·rollback의 현재 경로만 공식 문서와 기존 실험으로 확인한다. 신규 행 unique/upsert나 분산락으로 학습을 확대하지 않는다. AI/본인 작성 구분은 commit·작업 기록 없이 단정하지 않는다.

**Prediction / 다음 코드 1개:** 기존 부족 출고 fixture의 UI409 통합 회귀. 실행 전에 요청→commit/rollback→응답→재조회 순서와 원장/잔량을 예상한다. 기존 DB 실패 결과를 새 blind 예측으로 소급하지 않는다. **기존 측정 범위의 구현·검증 STOP은 유지하되 새 Human Defense/숙지 gate는 미확인**이다. 재시험을 추가하는 대신 우선 기존 증거를 15분 설명하고 작은 변경의 영향을 예측한다. 절약할 UI/test 보일러플레이트·결과 집계 시간을 MVCC/원자 증감·전체 rollback 설명에 투자한다.

### Human Gates와 학습 종료조건

아래 명세는 **AI 제안**이며 사용자가 자기 말로 Problem·Constraint·Invariant·Acceptance·Failure 다섯 항목을 기록하기 전에는 전체 구현을 위임하지 않는다. 기존 계획의 가설·선택이나 AI 작성 문서를 사용자의 판단으로 소급하지 않는다. 현재 본인 숙지 증거와 새 Gate 기록은 **unrecorded**이며 지식이 없다고 단정하지 않는다.

순서: AI 자료/코드 탐색 → **Problem Gate**(문제·범위·불변식 설명) → AI 대안 → **Decision Gate**(차이·제약·실패·선택 이유) → **Prediction Gate**(실행 전 예상 상태/이유/반증을 시각·revision과 기록) → AI 구현·자동화 → 실행 → **Evidence Gate**(예상 대비 결과·증명 범위·추가 실험 필요 판단) → AI 집계/문서 → **Defense Gate**. 기존 decision/evidence 기록에 사용자 원문과 AI 후보를 분리한다. 이미 본 결과는 사전 예측으로 쓰지 않는다. 준비용 fixture/harness 초안은 가능하지만 채택/실행/사람 판단 완료와 구분한다.

**Engineering STOP 추가:** 아래 Deep Dive를 AI·README·메모 없이 약 15분 동안 문제→도메인/runtime→현재 코드 흐름→실패→대안/선택→시험 설계→실제 결과→한계/확장 조건 순으로 설명한다. 핵심 코드를 읽고 작은 변경을 직접 수행하며 실행 전에 영향·디버깅 방향을 설명한다. 기존 Product STOP과 측정 범위는 그대로 유지하며 사람의 설명 증거를 코드 테스트 통과로 대체하지 않는다.

학습 우선순위는 “이 코드/기술이 핵심 engineering claim을 성립시키는가?”로 좁힌다. YES인 runtime 동작만 공식 문서/필요한 source·test → 최소 재현 → 사전 예측 → 실행 비교로 확인한다. 나머지 CRUD/UI/서식은 AI 초안과 검토로 처리한다. 절약 시간이나 숙련도 개선은 측정 전 수치로 주장하지 않는다.

## 목적과 이번 완료 범위

**기존에 존재하는 동일 SKU·창고 행에 대한 입출고에서 변경 유실과 초과 출고를 막고, 거래 전체 rollback을 유지한다.**
1개 전략을 적용하고 동일 workload로 재검증한 뒤 종료한다. 구현·배포·commit/push는 이번 계획 작성 요청에 포함하지 않는다.

확인된 반례: 초기100에 +10/+20 두 건 성공 후110(count) 또는120(g); 초기1에 출고 두 건 모두 성공 후0 또는-1. 단일 batch의 FK 실패 rollback은 한 시험에서 확인했다.
이 결과는 최소 PostgreSQL 스키마/직접 RPC 조건이다. 운영 장애 발생이나 전체 Supabase/API 보장으로 확대하지 않는다.

## 후보와 선택 규칙

| 대안 | 설계 | 비용/한계 |
|---|---|---|
| A | 대상 행을 일정 순서로 FOR UPDATE 후 현재 잔량 검사·변경 | 읽기부터 잠금 유지; 명시적 흐름이 단순하지만 hot row 대기, 신규 행 보호 불가 |
| B — 우선 후보 | 현재 DB 값에 대한 원자 증감 UPDATE; 출고는 잔량 조건 포함; RETURNING/영향 행으로 성공 확인 | 기존 행에 변경이 집중됨; 0행 결과·중복 행·단위·다품목 오류 처리를 명확히 해야 함 |

baseline은 해결 대안 수에 포함하지 않는다. 두 후보 모두 격리 DB의 작은 함수 변형으로 C1/C2/C4를 같은 조건에서 비교한다. 두 후보를 제품에 모두 구현하지 않는다.
양쪽이 정확성 기준을 통과하면 변경 범위·오류 계약·유지보수 복잡도로 하나를 선택한다. 2요청 지연 표본만으로 더 빠른 후보를 고르지 않는다.
현 시점 추천은 B다. 실제 후보 비교 전에는 우월성/성능 개선을 확정하지 않는다. 비교 중 결론이 불명확하면 채택 보류로 종료한다.

## 제품 계약과 선행 점검

- 정상 출고는 재고 부족 시 거래 전체 거절. 한 품목이라도 부족하면 앞선 품목·헤더·이력도 남지 않아야 한다.
- 입출고 type만 허용하고 수량은 양수·유효 숫자여야 한다. 완제품 numeric의 기존 소수 허용 계약은 타입/UI/기존 테스트로 확인하여 보존한다. material은 g 정수 계약을 명시하고 암묵적 반올림을 허용하지 않는다.
- 단위/제품 종류는 DB에 저장된 상품 정보와 대조한다. 요청의 product_type만 신뢰하여 다른 열을 변경하지 않는다. 이번 입력 검증은 재고 계산 계약에 필요한 범위로 제한한다.
- 동일 SKU·창고 기존 행이 정확히1개인지, 기존 음수/단위 불일치/중복이 있는지 폐기 가능한 데이터에서 점검한다. 잘못된 데이터를 LIMIT 1로 숨기거나 자동 합산·정리하지 않는다.
- 실제 full migration 환경을 별도 폐기 DB에 구성해 관련 제약/인덱스/role/RLS/함수를 확인한다. 불가능하면 직접 RPC 실험까지만 완료로 표시하고 제품 반영 준비 완료라고 하지 않는다.
- 이동/조정은 다른 쓰기 경로다. 이번 보장은 입출고끼리의 경쟁으로 한정하며 이동/조정과 동시에 실행되는 전역 정합성을 주장하지 않는다.

## 선택 시 B 구현 범위

1. 과거 migration을 고치지 않고 기존 관례에 맞춘 새 migration에서 같은 RPC 시그니처를 교체한다. SECURITY DEFINER/search_path/권한 및 성공 응답 형태는 호환성을 점검한다.
2. 기존 행의 입고는 quantity 또는 weight_in_grams를 DB 현재 값 기준으로 증감한다. 읽어 온 값으로 절대값을 덮어쓰는 경로를 제거한다.
3. 출고는 “현재 잔량 >= 요청량” 조건을 변경문에 포함한다. 변경이 없으면 안정적인 재고 부족 오류를 발생시키며, 정상 반환으로 부분 거래를 commit하지 않는다. 없는 재고의 출고는 생성하지 않고 거절한다.
4. 품목 처리 순서를 SKU/창고 기준으로 일관되게 정한다. 동일 요청 내 중복 SKU는 동일 단위 검증 후 합계로 처리하거나 명시적으로 거절하는 계약을 비교 전에 고정한다. 최소안은 중복 SKU 거절이며 기존 호출자가 중복을 보내는지 먼저 확인한다.
5. 신규 행 입고는 기존 동작의 별도 미검증 경계다. 기존 행 보강에 편승해 unique/upsert나 데이터 정리까지 추가하지 않는다. 없는 행 분기를 기존 행과 구분하고 회귀 검사한다. 신규 행 동시 생성까지 안전하다는 주장은 하지 않는다.
6. API는 재고 부족을 식별 가능한 업무 오류(제안 HTTP409, code INSUFFICIENT_STOCK)로 변환한다. 입력 오류400, 기술 장애와 구분한다. 성공 응답은 DB commit 이후에만 발생한다.
7. 기존 관련 테스트에서 정상 출고 음수를 허용하는 기대는 새 정책과 충돌하는지 확인한다. 관련 경로의 기대만 수정하고 전체 테스트 체계 정비로 확대하지 않는다.

전역 음수 CHECK나 SKU/창고 unique는 이동/조정·기존 데이터에도 영향을 주므로 이번에 자동 도입하지 않는다. 필요한 것으로 판명되면 범위 변경/채택 보류 사유로 남긴다.

## 재검증 설계

baseline 원시 결과는 덮어쓰지 않는다. 개선 전/후에 동일 fixture·PG 버전·자원·seed·workload·오류 위치를 사용한다.
단위 count/g를 분리하고 natural/gate를 구분한다. 최초 재현은 각 조건 1회, 반복 비교는 전/후 동일하게 각3회로 제한한다. 개선 후 hard failure가 한 번이라도 나면 추가 반복을 멈추고 실패로 종료한다.

| 시험 | 완료 기준 |
|---|---|
| C0 순차 +10/+20 | 초기100→130, 원장2건 |
| C1 동시 +10/+20 | 130, 성공2건, 원장과 일치; 자연/통제 스케줄 구분 |
| C2 초기1, 동시 출고1+1 | 정확히1건 commit, 1건 재고 부족 거절, 최종0, 거절 영향0 |
| C4 두 번째 품목 FK 실패 | 실패 직후 헤더/품목0·전 품목 잔량 그대로; 정상 recovery 성공 |
| 부족 batch 회귀 | 두 번째 품목 재고 부족도 첫 번째 품목까지 전체 rollback |
| 선택 전략 경계 C3/C5 | 충분한 잔량의 혼합 증감/역순 두 품목에서 원장 일치; deadlock/timeout을 성공이나 업무 거절로 세지 않음 |
| 입력/호환 회귀 | 0·음수·잘못된 단위·중복 SKU 계약·없는 행 출고 거절; 정상 신규 입고 호환 범위 확인 |

C3/C5와 새 회귀는 기존 baseline에서 미실행이다. 필요 시 전/후 쌍으로 새로 측정하며 과거 측정인 것처럼 쓰지 않는다.

기존 harness는 baseline RPC 바이트를 강제하므로 후보/개선 revision별 allowlist·hash manifest를 분리한다. 원본 검증을 끄거나 baseline vendor를 덮어쓰지 않는다.
개선된 C2의 재고 부족 오류 코드를 판정식에 추가하고 기술 오류를 통과로 오인하지 않게 한다. 업무 판정식은 전/후 동일하게 적용한다.
추가 원장 memo/헤더 필드·품목 수, active 단위 잔량, transaction id를 독립 검사한다. gate는 해제 이전 blocking chain으로 확인한다. 변경 전략에 따라 stale SELECT 중첩을 요구하지 않고 경쟁 요청/대기 범위를 확인한다.
연결 단절 시 서버 종료·원장 대조가 끝나지 않으면 unknown으로 남긴다. smoke는 rollback-only로 집계에서 제외한다.

## 지표·비용·종료조건

필수: 유실/음수/원장 불일치/부분 반영0, 성공·업무 거절·기술 오류·unknown별 건수, 실제 overlap coverage, 요청/transaction 대응, 원시 RPC latency·lock wait 근거.
p95/TPS/포화점은 이번 correctness 재검증의 필수 산출물이 아니다. n=2/인위 잠금 지연으로 성능 우열을 주장하지 않는다.
정확성 통과 뒤에도 이번 사이클에서 500/5000명 또는 부하 단계 확대를 자동 시작하지 않는다. hot SKU 비용 측정은 별도 질문으로 남긴다.

통과: 선택한1개 전략이 위 범위에서 invariant를 지키고 rollback/API 오류 계약·migration 검증이 완료됨.
실패: 정합성 반례1건, 업무 거절을 대신한 기술 오류, 판정 불명확, migration/호환 검증 미완료이면 채택 실패/보류로 기록.
scope 내 실패를 숨기고 완료 처리하지 않으며, 두 번째 전략을 연달아 적용하는 개선 루프도 자동 시작하지 않는다.

## Migration·API 확인과 retry 경계

clean 설치/기존 baseline→새 migration upgrade 양쪽에서 동일 함수와 관련 스키마를 확인한다. 원본 복구 SQL도 폐기 DB에서 검증하되 복구하면 알려진 기존 결함이 돌아온다는 점을 기록한다. 운영 배포는 이번 계획 밖이다.
실제 Next.js→Supabase 경로에서 성공·부족·FK 오류 각1건의 응답과 DB 효과를 확인한다. 알림은 외부 전송하지 않도록 test adapter를 쓰고 변경점을 manifest에 남긴다.
현재 알림 await는 commit 뒤에 있다. 알림/응답 실패를 거래 rollback으로 오인하지 않는다. 멱등성 키가 없으므로 timeout·deadlock·응답 유실 후 자동 재시도를 새로 추가하지 않는다.
retry/idempotency, 신규 행 경쟁, 이동/조정 동시성은 알려진 미검증 범위로 별도 기록한다. 안전한 재시도까지 해결한 것으로 포장하지 않는다.

## 산출물과 역할

향후 병렬 작업: 구현 담당은 선택된 migration/API 범위, 검증 담당은 독립 oracle/반례·회귀, supervisor는 후보 선택·DB 실행 순서·최종 판정을 담당한다. 공용 DB 부하 실행은 직렬화한다.
산출물: 후보 비교표, 선택 이유, baseline/개선 revision 및 diff/hash, 재현 명령·원시 JSON, 전후 정합성표, migration/API 확인 결과, 미검증 범위와 STOP 이유.
퀄리타스 JD 연결은 RDB·transaction·API 오류 계약·테스트·migration 검증으로 충분하다. FastAPI/Redis/Kafka/Queue/분산락/새 CI/CD/관측 플랫폼은 비범위다.
