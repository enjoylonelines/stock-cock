# ERP Lab 용량 경계 측정 기록

- 날짜: 2026-10-09
- 범위: disposable PostgreSQL 16.15, 로컬 TypeScript HTTP 프로세스 1개, PostgreSQL pool `max=4`, synthetic fixture만 사용
- 환경: macOS arm64, logical CPU 10, memory 64 GiB. 각 원시 JSON에 Git SHA, dirty tree, DB telemetry를 함께 기록했다.
- 공통 판정: unexpected error 0, balance reconciliation mismatch 0, `POSTED` 전표 중 원장 없는 전표 0. HTTP read p95 <= 200ms, write p95 <= 500ms.

## 결과

| Profile | 고정 workload | 최고 안정 단계 (3회 모두 통과) | 최초 기준 초과 | 관측 신호 |
| --- | --- | ---: | ---: | --- |
| 직접 대량 입고 | uniform, 1,000 SKU / 2 location, chunk 100, invalid-unit 1행, 60초 예산 | 10,000 rows | 50,000 rows | 60초에 27,600 / 27,600 / 27,700행까지만 완료. 모두 대사 불일치 0. |
| HTTP read | tenant-scoped 전표 조회, 8초, 3회 | 128 concurrent | 256 concurrent | p95 100.768~111.506ms -> 203.165~222.822ms. |
| HTTP write hot key | create -> confirm -> post receipt, 동일 product/location, 8초, 3회 | 128 concurrent | 256 concurrent | p95 403.830~428.896ms -> 783.906~858.449ms. |
| HTTP mixed | read 80% + 동일 hot-key write 20%, 8초, 3회 | 64 concurrent | 128 concurrent | read p95 40.237~41.048ms, write p95 248.502~256.652ms -> 한 반복의 write p95 610.871ms. |

### 대량 입고 원시 근거

- 요약: `labs/erp-domain/ecount/evidence/2026-10-08-capacity-import-uniform-v2-summary.json`
- 1,000행: 1,857.094~1,921.406 rows/s, 세 반복 통과.
- 10,000행: 933.658~947.148 rows/s, 세 반복 통과.
- 50,000행: 사전에 선언한 60초 예산 초과. 중간 결과도 보존했고, 이 단계의 부분 결과를 성공으로 바꾸지 않았다.
- 통과한 반복은 idempotency-key 재실행 뒤 문서/원장 증가가 0이었다.

### HTTP 원시 근거

- Read 안정/초과: `2026-10-09-capacity-http-read-v2-step128-summary.json`, `2026-10-09-capacity-http-read-v2-step256-summary.json`
- Write 안정/초과: `2026-10-09-capacity-http-write-v2-step128-summary.json`, `2026-10-09-capacity-http-write-v2-step256-summary.json`
- Mixed 안정/초과: `2026-10-09-capacity-mixed-v2-step64-summary.json`, `2026-10-09-capacity-mixed-v2-step128-summary.json`
- 세부 반복 JSON은 같은 `labs/erp-domain/ecount/evidence/` 디렉터리에 보존했다.

## 측정 중 발견·수정한 검증 결함

처음 mixed 실행에서 연결 reset과 문서/원장 개수 불일치처럼 보이는 결과가 발생했다. 원인은 벤치마크가 `pnpm` 부모만 종료해 자식 HTTP 서버가 남을 수 있었던 점이었다. `capacity_benchmark.py`는 이제 프로세스 그룹 전체를 종료하고, `POSTED`인데 원장이 없는 전표를 별도 대사 실패로 판정한다. 수정 전 HTTP/mixed `v1` 결과는 결정 근거에서 제외했다.

## 해석 한계

- 이 값은 고객 수, 운영 트래픽, 인터넷 지연, 인증/RLS, 다중 프로세스 writer, 장시간 soak, 재시작 복구를 뜻하지 않는다.
- HTTP 반복은 환경 제약상 8초이며 계획의 120초 측정을 대체하지 않는다.
- 수치가 pool max 4보다 큰 동시 요청을 처리한 것은 요청이 클라이언트/Node/DB에서 대기하며 진행됐다는 뜻일 뿐, pool 확장이나 운영 안정성을 증명하지 않는다.

## 후속 개선 실험 — durable import job

50,000행 동기 입고는 60초 예산에서 약 27.6k행까지만 처리됐으므로, `import_jobs`와 `import_job_rows`를 추가했다. 입력 행·행별 terminal 결과·lease를 DB에 보존하고, worker는 기존 `bulk_receipt_documents`를 1,000행 chunk로 호출한다. 전표 반영과 해당 행 결과 갱신은 같은 DB 트랜잭션이다.

| 항목 | 동기 baseline | durable job 측정 |
| --- | ---: | ---: |
| 입력 | 50,000행 | 50,000행 (invalid unit 1행) |
| 요청/등록 시간 | 60초 예산 내 미완료 | 1,057.366ms에 job 등록 완료 |
| 전체 완료 | 예산 초과, 27.6k~27.7k행 부분 처리 | 202,565.011ms, 49,999 `POSTED` / 1 `REJECTED` |
| 처리율 | 약 828~831 rows/s인 부분 구간 | 246.834 rows/s |
| 재시작 | 미지원 | 3,000행 뒤 lease 강제 만료, 새 lease로 완료 |
| 대사 | 부분 처리 행에서 mismatch 0 | mismatch 0, `POSTED` 전표 중 원장 없는 전표 0 |

원시 결과: `labs/erp-domain/ecount/evidence/2026-10-09-durable-import-job-v1.json`.

이는 처리량 개선 주장이 아니다. staging/행 결과 저장 비용 때문에 worker 처리율은 낮아졌다. 대신 요청을 오래 붙잡지 않고 작업 상태·행별 오류·중단 후 재개를 보존한다는 업무 요구를 충족한 실험이다. 이번 측정은 direct DB job-command이며 HTTP API·인증·다중 worker 경쟁은 아직 검증하지 않았다.

### Receipt set-based 개선

행별 workflow worker의 병목을 확인한 뒤, 현재 workload와 같은 **단일 line receipt**에만 set-based 반영 경로를 추가했다. 출고·이동·역분개는 기존 workflow를 유지한다.

| worker | 50,000행 완료 | 처리율 | 결과 |
| --- | ---: | ---: | --- |
| 행별 workflow, chunk 1,000 | 202,565.011ms | 246.834 rows/s | 49,999 반영 / 1 거절 / lease 재개·대사 통과 |
| receipt set-based, chunk 1,000 | **9,462.683ms** | **5,283.914 rows/s** | 49,999 반영 / 1 거절 / lease 재개·대사 통과 |

완료 시간은 95.3% 감소했다. 원시 결과: `labs/erp-domain/ecount/evidence/2026-10-09-durable-import-job-set-based-v1.json`. 이 개선은 receipt fixture에서만 검증됐으며, 다중 worker 경합·HTTP API·다른 전표 유형에는 확장하지 않는다.

## LRU 가용재고 조회 workload

직접 구현한 in-process `LruCache`를 tenant·product·location 키의 가용재고 조회에만 연결했다. 동일 local HTTP process와 seeded balance에서 동일 키를 300회 순차 조회했다.

| 조건 | 총 시간 | 요청당 시간 | cache 상태 |
| --- | ---: | ---: | --- |
| LRU capacity 0 | 568.192ms | 1.894ms | 300 MISS |
| LRU capacity 10 | 79.017ms | 0.263ms | 300 HIT |

동일 loopback hot-read에서 요청당 시간은 86.1% 감소했다. 입고 전표를 HTTP로 반영한 뒤 같은 키는 `MISS`로 다시 DB를 조회했고, 수량이 10에서 15로 갱신된 것을 확인했다. HTTP 통합 검증은 capacity 10에서 `MISS -> HIT ->` 반전 전표 `-> MISS`와 수량 0 복귀, 전표/원장/잔량 대사 불일치 0을 통과했다.

이 결과는 단일 process·순차 요청·단일 hot key의 synthetic 결과다. 이번 cycle은 **단일 TypeScript worker에서 종료**하며, multi-process cache coherence, TTL, cache stampede, 실제 사용자 트래픽과 다중 worker import 경합은 구현·검증 범위에 포함하지 않는다.
