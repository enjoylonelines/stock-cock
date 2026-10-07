# ERP domain Deep Dive DD-A2 — 읽기 workload와 인덱스 선택

Date: 2026-10-07  
Repository / branch / baseline HEAD: `/Users/hb/Projects/inventory/checkout` / `main` / `c4ea725`  
Scope: isolated ECOUNT ERP Domain Lab only. This run does not exercise the existing Stock-Cock database, API, cache, or production infrastructure.

## Question

고정된 ERP 재고 read model에서 현재고, 최근 원장 이력, 기간별 입출고 합계,
창고별 부족 재고 중 무엇이 먼저 병목이 되며, 인덱스만으로 충분한가?

## Fixture and method

- PostgreSQL 16 disposable loopback container
- tenant 1개, SKU 1,000개, location 2개, stock ledger 120,000행
- hot SKU가 원장 행의 50%를 차지하도록 생성
- 각 쿼리는 warm-up 3회 뒤 client-side 30회 측정; `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`으로 DB 실행 시간과 plan node를 1회 기록
- baseline 뒤 `stock_ledger(tenant_id, product_id, location_id, posted_at DESC) INCLUDE (quantity_delta)`와 `inventory_balances(tenant_id, location_id, quantity) INCLUDE (product_id)`를 추가하고 같은 fixture에서 재측정

Raw result: `labs/erp-domain/ecount/evidence/2026-10-07-dd-a2-read-baseline-v2.json`

첫 `v1` 실행은 Python PostgreSQL driver의 `%` placeholder escape 오류로 seed 전에 중단됐다. 이는 DB 측정값이 아니므로 판단에서 제외하고 파일만 보존했다. `v2`만 accepted result다.

## Results

| Query | Baseline p50 / p95 (ms) | Indexed p50 / p95 (ms) | Plan change | Interpretation |
| --- | ---: | ---: | --- | --- |
| Current stock | 0.539 / 1.017 | 0.577 / 0.750 | Index Scan → Index Scan | 기존 PK로 충분했다. |
| Recent ledger history | 7.195 / 8.692 | 0.739 / 1.162 | Bitmap Heap + Sort → Index Scan | 정렬된 최근 이력 조회가 가장 뚜렷하게 개선됐다. |
| Period movement | 8.810 / 12.166 | 1.345 / 2.922 | Bitmap scan 유지 | 기간 조건을 복합 인덱스가 좁혔다. |
| Location shortage | 0.520 / 1.292 | 0.469 / 0.580 | Seq Scan + Sort → Index Only Scan | 작은 balance read model에서도 scan/sort가 사라졌다. |

측정값은 같은 로컬 컨테이너와 warm cache에서 얻은 client latency다. p95는 30개 표본의 분위수이며, 네트워크·동시 클라이언트·DB CPU/RSS·처리량을 대표하지 않는다.

## Decision

Cycle 2의 이 fixture에서는 원장 read path에 두 복합 인덱스를 채택한다. 현재고 단건 조회는 기존 PK로 충분했고, 인덱스 전후 모두 낮은 값이므로 별도 cache를 도입하지 않는다. aggregation table, Redis, queue, Kubernetes는 이 결과에서 필요성이 확인되지 않아 추가하지 않는다.

## Limits

- synthetic 12만 행은 고객 데이터 규모나 운영 처리량이 아니다.
- hot SKU 50%는 병목 탐색을 위한 의도적 분포이며 실제 고객 분포가 아니다.
- write contention, vacuum/bloat, buffer eviction, multi-tenant noisy neighbor, connection wait, RLS/API 권한은 측정하지 않았다.
- index write amplification과 장기 운영 비용은 별도 write workload가 있어야 판단할 수 있다.
