# Stock Cock Portfolio Handoff

> Status: U5 handoff
> Scope: externally usable portfolio claims and evidence boundaries
> Last reviewed: 2026-08-16

## Positioning

Stock Cock should be presented as a real-user manufacturing inventory product, not as an AI project.

Recommended one-line positioning:

> 엑셀 수기 업데이트로 최신 재고 확인이 어려웠던 제조 현장 업무를 위해 만든 Next.js/Supabase 기반 PWA 재고관리 서비스입니다.

Short English version:

> A real-user PWA inventory management service built with Next.js and Supabase for a manufacturing workflow that previously depended on manual Excel updates.

## Best Portfolio Summary

### Korean

엑셀 수기 업데이트로 최신 재고 수량을 맞추기 어려웠던 제조 현장 업무를 위해, Next.js와 Supabase 기반 PWA 재고관리 서비스를 만들었습니다. 운영자, 현장 관리자, 재고 담당자 3명이 주 사용자로 사용 중이며, 그 외 구성원도 필요 시 재고를 조회합니다. 실제 사용 피드백을 바탕으로 완제품 중심 관리에서 원재료 재고 관리까지 확장했습니다.

### English

I built a Next.js and Supabase-based PWA inventory management service for a manufacturing workflow where stock was previously updated manually in Excel. The product is primarily used by an operator, a field manager, and an inventory manager, while other members check inventory as needed. Based on real user feedback, I expanded the product from finished-goods tracking to raw-material inventory management.

## Evidence Map

| Claim | Status | Evidence |
|---|---|---|
| Prior workflow used manual Excel updates | `[user_confirmed]` | User confirmation during U1/U2. |
| Three primary users use the product | `[user_confirmed]` | Operator, field manager, inventory manager. |
| Other members also check inventory | `[user_confirmed]` | User confirmation. |
| App profile table has 11 profiles | `[deployed]` | Supabase REST HEAD/count on `profiles`; not a direct Auth Admin count. |
| Live demo exists | `[deployed]` | `https://stock-cock.vercel.app` responds and redirects to `/auth/signin`. |
| Product has operational Supabase data | `[deployed]` | Non-empty profiles, products, product options, warehouses, suppliers, inventory, transactions, transaction items, and push subscriptions were confirmed by HEAD/count only. |
| Main workflow is stock quantity management | `[user_confirmed]`, `[code_verified]` | User confirmation plus inventory/stat/history code paths. |
| Raw-material management came from feedback | `[user_confirmed]`, `[code_verified]` | User feedback plus material type and `weight_in_grams` migrations/code. |
| PWA support exists | `[code_verified]` | `next.config.ts`, `public/manifest.json`, `worker/index.ts`, iOS meta tags. |
| Push notification implementation exists | `[code_verified]`, partially `[test_verified]` | push service, subscription hook, transaction notification utility, focused push tests. |
| In/out transaction uses RPC | `[code_verified]` | `/api/transactions` calls `create_transaction`; migrations define/fix RPC. |
| Move/adjustment RPC | `[work_in_progress]` | Dirty route changes and untracked migration exist; not production-verified. |
| Role-based authorization/RLS | `[unknown]` | Admin role was considered, but current permissions should not be claimed as role-separated. |

## Product Story

### Problem

Before Stock Cock, stock quantities were updated manually in Excel. Because the workflow depended on manual updates, it was hard to keep current inventory reliable.

### Product

Stock Cock gives users a web/PWA flow for:

- checking current inventory,
- recording in/out stock changes,
- reviewing transaction history,
- receiving push notifications for stock-changing events,
- managing both finished goods and raw materials.

### Feedback Loop

The initial scope focused on finished goods. After users asked to manage raw materials as well, the product added material inventory support with gram-based storage and formatting.

### Engineering Decisions

| Decision | Why it matters | Boundary |
|---|---|---|
| Supabase | Helped ship auth, database, storage, and API-backed MVP quickly. | Do not overclaim detailed RLS or role separation yet. |
| PWA | Fits a lightweight field-access workflow without app store distribution. | iOS install/push behavior needs real-device validation. |
| SWR + Zustand | Separates server state from UI/form state. | Keep it as implementation support, not the main portfolio story. |
| Domain stock layer | Separates finished-goods count and raw-material gram handling. | Strong code evidence for the raw-material feedback response. |
| `create_transaction` RPC | Moves in/out transaction writes into a DB function call. | Do not claim full concurrency, rollback test coverage, or negative-stock prevention. |

## Technical Evidence To Link

- Real-user case: `docs/portfolio/REAL_USER_CASE_STUDY.md`
- Transaction integrity: `docs/portfolio/TRANSACTION_INTEGRITY_EVIDENCE.md`
- Workflow evidence: `docs/portfolio/PRODUCT_WORKFLOW_EVIDENCE.md`
- In/out API: `src/app/api/transactions/route.ts`
- Material domain: `src/lib/domain/stock.ts`, `src/lib/domain/format.ts`
- Inventory utility tests: `src/__tests__/inventory.test.ts`
- Push tests: `src/__tests__/push-notification.test.ts`
- PWA config: `next.config.ts`, `public/manifest.json`, `worker/index.ts`

## Safe Resume Bullets

- Built a real-user inventory management PWA for a manufacturing workflow previously managed through manual Excel updates.
- Designed inventory flows for current stock checks, in/out transaction recording, history review, and push notification support.
- Incorporated user feedback by expanding the product from finished-goods tracking to raw-material inventory management with gram-based handling.
- Used Next.js, Supabase, SWR, Zustand, and a domain stock layer to separate UI state, server data, and stock-unit formatting.
- Moved in/out transaction writes to a Supabase RPC and documented remaining validation boundaries around concurrency, rollback, and negative-stock policy.

## Safe Interview Answer

이 프로젝트는 AI 기능을 넣은 프로젝트가 아니라, 실제 제조 현장 재고관리 문제를 제품으로 풀어본 경험입니다. 도입 전에는 엑셀을 수기로 업데이트해서 최신 재고 수량을 맞추기 어려웠고, 주 사용자인 운영자·현장 관리자·재고 담당자가 재고 수 관리를 가장 많이 사용했습니다. 실제 피드백으로 완제품뿐 아니라 원재료도 관리해야 한다는 요구가 있었고, 이를 반영해 원재료를 g 단위로 저장·표시하는 도메인 로직과 화면 흐름을 추가했습니다.

기술적으로는 Next.js와 Supabase를 선택해서 짧은 기간 안에 인증, DB, 배포, PWA 흐름을 갖췄습니다. 입출고 거래는 현재 `create_transaction` RPC로 묶어 처리하지만, 동시성 제어와 음수 재고 방지, 이동·조정 RPC의 production 검증은 아직 별도 검증 대상으로 분리해서 설명합니다.

## Expected Questions

### 실제 사용자가 있었나요?

네. 운영자, 현장 관리자, 재고 담당자 3명이 주 사용자이고, 그 외 구성원도 필요할 때 재고를 조회합니다. 전체 활성 사용자 수나 사용 빈도는 별도 계측 근거가 없어 주장하지 않습니다.

### 도입 전 문제는 무엇이었나요?

재고를 엑셀로 수기 업데이트했기 때문에 최신 수량을 신뢰하기 어려웠고, 재고 수 관리가 안정적으로 이어지기 어려웠습니다.

### 사용자 피드백이 제품에 반영된 사례가 있나요?

초기에는 완제품 중심 관리였지만, 실제 사용 중 원재료도 관리해야 한다는 요청을 받았습니다. 이후 `material` 타입과 `weight_in_grams` 기반 원재료 관리 흐름을 추가했습니다.

### 왜 Supabase를 선택했나요?

1인 개발과 짧은 MVP 기간에서 인증, DB, 스토리지, API 연동을 빠르게 묶기 위해 선택했습니다. 대신 벤더 종속성과 migration/RPC 검증 비용이 생기므로, 중요한 거래 정합성 claim은 코드 근거와 통합 검증 여부를 분리해서 설명합니다.

### 왜 PWA였나요?

현장 사용자가 별도 앱스토어 배포 없이 접근할 수 있는 웹 기반 흐름이 필요했기 때문입니다. 단일 코드베이스와 빠른 배포가 장점이지만, iOS PWA와 push 제약은 별도 검증이 필요합니다.

### 거래 정합성은 어떻게 설명하나요?

입출고는 현재 `/api/transactions`에서 `create_transaction` RPC를 호출하고, 해당 RPC가 거래 헤더, 재고 갱신, 거래 아이템 기록을 DB 함수 안에서 처리합니다. 다만 rollback 실패 주입 테스트, 동시 요청 테스트, 음수 재고 정책은 아직 검증 전이므로 완전한 정합성 보장으로 표현하지 않습니다.

## Claims To Avoid

- AI, 수요예측, 자동발주, LLM 챗봇 기능이 있다고 말하지 않는다.
- 사용자 수를 전체 가입자/활성 사용자 수처럼 확대하지 않는다.
- 시간 절감, 효율 개선률, 매출 영향, 재고 부족 감소율을 말하지 않는다.
- 회사명, 사용자 이름, 재고량, 매출, 내부 운영 데이터를 공개하지 않는다.
- RLS 기반 세밀 권한이나 관리자 권한 분리를 구현 완료로 말하지 않는다.
- 이동·조정 RPC가 production 검증 완료됐다고 말하지 않는다.
- 동시성 제어, rollback 테스트, 음수 재고 방지를 완료 claim으로 말하지 않는다.

## Screenshot Guidance

- `public/screenshots/mobile.png`: 모바일 홈/재고 현황 흐름을 보여주는 보조 이미지로 사용할 수 있다. 다만 최신 UI와 날짜가 다를 수 있어 외부 공개 전 재촬영하면 더 좋다.
- `public/screenshots/desktop.png`: 브라우저 탭과 북마크가 그대로 보여 외부 공개용으로는 부적합하다. 필요하면 로그인/민감정보 없이 새로 캡처한다.

## Next Work

Recommended implementation follow-ups, separate from portfolio copy:

- verify Supabase Auth user count through dashboard or service-role Admin API,
- fix `transaction-notification.test.ts` mock path,
- validate move/adjustment RPC signatures and migration application,
- define negative-stock policy,
- add DB integration tests for rollback and concurrent updates,
- recapture clean mobile and desktop screenshots for external portfolio use.

