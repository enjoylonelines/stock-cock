# ERP Lab 용량 경계 후속 설계 결정

- 입력 근거: `docs/evidence/2026-10-09-erp-domain-capacity-boundary.md`
- 결정 범위: ECOUNT ERP Lab의 synthetic, disposable loopback 환경. Stock-Cock 운영 구조 변경 결정이 아니다.

## 문제

기존 단일 TypeScript 서버 + PostgreSQL 구조에서 대량 입고와 hot-key 전표 반영이 어떤 조건에서 먼저 지연되는지 몰랐다. 따라서 Redis, Kafka, worker를 먼저 추가할 근거가 없었다.

## 관측과 판단

1. 직접 대량 입고는 60초 예산에서 10,000행까지 세 번 모두 행별 성공/거절, 재실행 idempotency, 원장/잔량 대사를 통과했다. 50,000행은 약 27.6k행 처리 뒤 예산을 넘겼다.
2. 순수 조회는 128 동시에서 p95 100.768~111.506ms로 통과하고, 256에서 세 번 모두 200ms를 넘었다.
3. 동일 재고 키를 쓰는 전표 workflow는 128 동시에서 p95 403.830~428.896ms로 통과하고, 256에서 세 번 모두 500ms를 넘었다.
4. 80/20 혼합은 64 동시에서 세 번 모두 read/write 기준을 통과했지만, 128에서 3회 중 1회 write p95가 610.871ms로 초과했다. 오류·대사 불일치는 0이었다.

## 지금 선택

현재 cycle에서는 Redis, Kafka, pool 상향을 구현하지 않는다. 관측된 첫 실패는 데이터 정합성 오류가 아니라 지연 예산 초과이며, 짧은 loopback 반복만으로 어떤 인프라가 원인인지 분리되지 않았다.

대신 API/운영 계약에 다음 경계를 둔다.

- 동기 bulk receipt의 실험상 안전한 상한은 **60초 예산 내 10,000행**으로만 말한다. 50,000행 입력을 동일 요청으로 받는 기능은 추가하지 않는다.
- mixed workload는 이 환경·이 workload에서 **64 동시까지 안정**, **128에서 최초 기준 초과 관측**으로만 설명한다.
- 검증된 128/256 단계는 사용자 수가 아니라 활성 요청 수다.

## 선택한 후속 개선 — DB 기반 durable import job

50,000행을 동기 요청으로 끝내는 것이 아니라 진행률·행별 결과·재개가 필요한 요구로 해석해 `import_jobs`, `import_job_rows`, lease claim, bounded chunk worker를 구현했다. 50,000행 실험에서 job 등록은 1,057.366ms, worker 완료는 202,565.011ms였고 3,000행 뒤 lease 만료 후 새 lease가 재개해 49,999건 반영·1건 거절·대사 0을 확인했다.

이 선택은 성능 최적화가 아니다. staging 비용으로 worker 처리율은 baseline 부분 구간보다 낮았다. 따라서 포트폴리오에는 “50,000행을 더 빠르게 처리했다”가 아니라 “60초 동기 요청 한계를 진행 가능한 durable job으로 전환하고 중단 후 재개를 검증했다”로 기록한다.

후속 측정에서 receipt-only set-based 경로는 같은 50,000행을 9.463초에 처리했고 lease 재개·행별 결과·대사를 유지했다. 따라서 이 제한된 입고 workload에서는 처리 방식 개선도 확인됐다. 이 수치를 출고·이동·역분개 또는 일반 ERP workload로 일반화하지 않는다.

## 다음 설계가 열리는 조건

| 실제 요구/관측 | 다음 후보 | 채택 전 필요한 증거 |
| --- | --- | --- |
| 50,000행 이상을 하나의 요청에서 받고 진행률·재시작이 필요 | durable `import_jobs` + row staging + lease worker | 중단 뒤 다른 worker 재개, idempotent resume, 행별 결과/대사 0 증명 |
| 장시간 혼합 workload에서 pool wait가 지연의 주원인 | admission control 또는 pool-size 실험 | pg wait, p95, error, 대사를 함께 비교 |
| hot-key lock wait가 지연의 주원인 | product/location keyed serialization 또는 chunk 정책 | lock wait 감소와 문서 원자성/행 결과 보존 |
| 재조회가 DB 비용의 주원인이고 stale 정책 합의됨 | targeted cache | hit/miss, invalidation, stale 허용 범위, write 비용 비교 |

이 결정은 “대규모 분산 처리 구현” 주장이 아니라, 단순 구조의 측정 가능한 한계를 먼저 확인하고 복잡성 도입 조건을 남긴 결과다.

## 종료 범위

ERP Lab은 단일 TypeScript worker와 PostgreSQL로 종료한다. durable import의 lease는 중단 후 재개 가능한 작업 계약을 검증한 것이며, 독립된 두 worker 프로세스의 claim 경쟁·failover·캐시 일관성을 검증한 결과가 아니다. 따라서 해당 요구가 생기기 전에는 worker pool, Redis, Kafka를 추가하지 않는다.
