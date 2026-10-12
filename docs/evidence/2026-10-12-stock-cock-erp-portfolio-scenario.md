# stock-cock · ERP Lab 포트폴리오 시연 시나리오

- 작성일: 2026-10-12
- 목적: 실제 재고관리 PWA의 업무 화면과 후속 ERP Lab의 대량 적재 검증을 하나의 포트폴리오 시연으로 연결한다.
- 비목적: ERP Lab 결과를 stock-cock 운영 성과, 실제 고객 처리량, 운영 동시성 안정성으로 표현하지 않는다.

## 영상 흐름

1. **실제 업무 화면** — 기존 mobile 화면에서 현재고, 제품 등록, 입출고 진입점을 보여 준다.
   - 근거: `public/screenshots/mobile.png`, `docs/portfolio/PRODUCT_WORKFLOW_EVIDENCE.md`
   - 주장 범위: 실사용 피드백을 반영한 모바일 현재고·입출고·이력 업무 흐름과 코드 경로.
2. **기록 경계** — 입출고 요청이 API를 거쳐 `create_transaction` RPC 한 호출로 전달되고, 거래·현재고·거래품목 기록을 DB 함수 안에서 처리하는 구조를 보여 준다.
   - 근거: `src/app/api/transactions/route.ts`, Supabase migration, `docs/portfolio/TRANSACTION_INTEGRITY_EVIDENCE.md`
   - 제외: 운영 DB migration 적용 상태, rollback, 동시성, 음수 재고 방지.
3. **후속 ERP Lab** — disposable PostgreSQL 16에서 50,000행 single-line receipt fixture를 durable import job으로 처리하고, lease 만료 뒤 재개·대사를 보존한 결과를 보여 준다.
   - 근거: `labs/erp-domain/ecount/evidence/2026-10-09-durable-import-job-set-based-v1.json`
   - 결과: 49,999 `POSTED`, 1 `REJECTED`, reconciliation mismatch 0, set-based worker 9,462.683ms.
4. **비교와 경계** — 동일 fixture에서 row worker 202,565.011ms 대비 set-based worker 9,462.683ms였다. 시간 95.3% 감소는 single-line receipt fixture의 disposable DB 결과이며, HTTP API·다중 worker·다른 전표 유형·실제 운영에는 일반화하지 않는다.

## 촬영 규칙

- 실제 운영 계정, 운영 데이터, 입출고 제출을 사용하지 않는다.
- 영상은 ‘portfolio scenario’로 표기하며, 첫 장면의 모바일 UI 외에는 근거와 결과를 설명하는 카드다.
- source 영상과 만든 GIF/MP4는 `docs/evidence/2026-10-12-stock-cock-erp-portfolio-scenario/`에 저장한다.
- `scripts/capture-stock-cock-erp-scenario.mjs`가 모바일 스크린샷과 ERP Lab JSON을 읽어 결과 자산을 생성한다.
