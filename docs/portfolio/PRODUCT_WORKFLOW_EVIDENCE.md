# Product Workflow Evidence

> Status: U4 evidence pack
> Scope: product workflow, UI, code, deployment, and evidence boundaries
> Last reviewed: 2026-08-16

## Summary

Stock Cock should be described as a real-user manufacturing inventory workflow product. The strongest public story is:

1. users moved away from manual Excel updates,
2. primary users manage stock quantities in the app,
3. the product records stock-changing work as transactions,
4. current stock and history are visible in the UI,
5. real feedback expanded the model from finished goods to raw materials.

This document connects that product story to current code, screenshots, tests, and deployment evidence without claiming unverified impact metrics.

## Workflow Map

| Workflow Step | User Meaning | Status | Evidence |
|---|---|---|---|
| Check current inventory | Users can see stock quantities instead of relying on manually updated Excel state. | `[code_verified]`, `[user_confirmed]` | `src/hooks/useInventories.ts`, `src/app/home/_hooks/useStats.ts`, `src/app/home/_components/StatsBox.tsx` |
| Record in/out transactions | Primary users can record inbound/outbound stock changes. | `[code_verified]` | `src/app/transaction-form/_hooks/useTransactionForm.ts`, `src/app/transaction-form/_services/transaction-service.ts`, `src/app/api/transactions/route.ts` |
| Update current stock | In/out transaction writes call `create_transaction`, which updates `inventory` and `transaction_items`. | `[code_verified]` | `src/app/api/transactions/route.ts`, `supabase/migrations/20260131110000_fix_create_transaction_rpc_signature.sql` |
| Review transaction history | Users can review stock-changing activity and see grouped transaction records. | `[code_verified]` | `src/hooks/useTransactionHistory.ts`, `src/app/transactions/_components/TransactionList.tsx`, `transaction_history_view` migrations |
| Receive notification | Push notification code exists for transaction completion and subscription management. | `[code_verified]`, partially `[test_verified]` | `src/utils/transaction-notification.ts`, `src/services/push-notification.ts`, `src/hooks/usePushNotifications.ts`, `src/app/settings/_components/PushNotificationSettings.tsx` |
| Install/use as PWA | App has manifest, service worker, and iOS standalone meta support. | `[code_verified]` | `next.config.ts`, `public/manifest.json`, `worker/index.ts`, `src/app/layout.tsx`, `src/components/providers/ServiceWorkerReload.tsx` |
| Manage raw materials | User feedback requested material inventory; code supports material type and gram-based stock. | `[user_confirmed]`, `[code_verified]` | `src/lib/domain/stock.ts`, `src/lib/domain/format.ts`, material migrations |

## Code Evidence By Flow

### 1. Current Stock

`src/hooks/useInventories.ts` fetches `inventory` through Supabase and exposes it through SWR. `src/app/home/_hooks/useStats.ts` combines `transactions` and `inventory` queries to show home-level stock stats. `src/app/home/_components/StatsBox.tsx` renders total stock, inbound, outbound, and raw-material usage.

Evidence status: `[code_verified]`

Boundary: this confirms the code path and UI intent. It does not prove current stock correctness under concurrent writes.

### 2. In/Out Recording

The transaction form hook validates the selected warehouse, supplier context, selected products, date, memo, and user id, then submits through `transactionService.create`. The service posts to `/api/transactions`, and the API route calls `create_transaction`.

Evidence status: `[code_verified]`

Boundary: in/out RPC presence is verified from code and migration files. This pass did not perform a live write.

### 3. Stock Update And History

The `create_transaction` migration inserts a transaction header, loops over items, updates/inserts `inventory`, and inserts `transaction_items`. The history hook reads `transaction_history_view`, merges inventory state, groups transactions by date, and subscribes to `transactions` inserts for revalidation.

Evidence status: `[code_verified]`

Boundary: history reconstruction is code-verified but not DB-integration-verified in this pass.

### 4. Push Notification

The transaction API calls `sendTransactionNotification` after the RPC result. Notification content is built by transaction type and raw-material weight. `sendPushDirect` sends web-push messages to saved `push_subscriptions`, and the client hook manages device-specific subscriptions using `device_id`.

Evidence status: `[code_verified]`, partially `[test_verified]`

Boundary: focused push tests passed in U1 for `push-notification.test.ts`, but live browser delivery and iOS push behavior were not verified.

### 5. PWA Deployment And Update Handling

The app uses `@ducanh2912/next-pwa`, `public/manifest.json`, a custom service worker in `worker/index.ts`, and iOS standalone meta tags in `src/app/layout.tsx`. `ServiceWorkerReload` reloads the page when a new service worker controls the app.

Evidence status: `[code_verified]`

Boundary: installability and iOS behavior still need real-device validation.

## Screenshot Evidence

| File | Evidence Value | Boundary |
|---|---|---|
| `public/screenshots/mobile.png` | Shows mobile home stock dashboard and entry points for product and in/out management. | Screenshot date/content may not exactly match the latest UI; use as illustrative evidence unless recaptured. |
| `public/screenshots/desktop.png` | Shows deployed settings page and push notification settings area. | Not ideal for public portfolio because browser chrome, tabs, and bookmarks are visible. Recapture before external use. |

No screenshot files were overwritten in this pass.

## Deployment Evidence

| Claim | Status | Evidence |
|---|---|---|
| Live demo exists | `[deployed]` | `https://stock-cock.vercel.app` responded with a Vercel `307` redirect to `/auth/signin` during U1. |
| Vercel project metadata exists locally | `[deployed]` | `.vercel/project.json` identifies the local Vercel project. |
| Remote Supabase contains operational data | `[deployed]` | HEAD/count checks showed non-empty profiles, products, product options, warehouses, suppliers, inventory, transactions, transaction items, and push subscriptions. Row contents were not read or disclosed. |

Boundary: Live demo access was checked without login, signup, or data mutation.

## Tests And Verification

Focused tests from U1:

| Test File | Result | Meaning |
|---|---|---|
| `src/__tests__/inventory.test.ts` | passed with `--no-watchman` | Covers inventory utility behavior, including material/finished-goods paths. |
| `src/__tests__/push-notification.test.ts` | passed with `--no-watchman` | Covers push direct edge cases and partial success aggregation. |
| `src/__tests__/api-handler.test.ts` | passed with `--no-watchman` | Covers API error wrapper behavior. |
| `src/__tests__/transaction-notification.test.ts` | failed to load | Test mocks `@/lib/supabase`, a path that is not present in current code. This should be fixed separately. |

No tests were run in this U4 pass because this pass only adds documentation.

## User Evidence

| Fact | Status | Evidence |
|---|---|---|
| Before adoption, inventory was updated manually in Excel. | `[user_confirmed]` | User confirmation during U1/U2. |
| Main workflow is stock quantity management. | `[user_confirmed]` | User confirmation during U1/U2. |
| Three primary roles use the app. | `[user_confirmed]` | Operator, field manager, inventory manager. |
| Other members also check inventory when needed. | `[user_confirmed]` | User confirmation. |
| Raw-material support came from feedback. | `[user_confirmed]`, `[code_verified]` | User confirmation plus material code/migrations. |

## Safe Workflow Claim

Korean:

> 엑셀 수기 업데이트로 최신 재고 확인이 어려웠던 제조 현장 업무를 위해, 현재고 확인과 입출고 기록, 거래 이력 확인을 하나의 PWA 흐름으로 묶었습니다. 실제 사용 피드백을 반영해 완제품뿐 아니라 원재료 재고도 g 단위로 관리할 수 있도록 확장했습니다.

English:

> I built a PWA inventory workflow for a manufacturing team that moved stock checks and in/out records away from manually updated Excel files. Real user feedback expanded the product from finished-goods tracking to raw-material inventory management.

## Do Not Claim Yet

- Do not claim exact active-user count beyond the three primary users and unspecified other viewers.
- Do not claim time saved, percentage efficiency improvement, or revenue impact.
- Do not claim full role-based authorization.
- Do not claim production-verified move/adjustment RPC atomicity.
- Do not claim complete concurrency control or negative-stock prevention.
- Do not use the current desktop screenshot externally without recapturing or cropping browser chrome.

## Proposed U5 Handoff Inputs

Use these as the basis for `STOCK_COCK_PORTFOLIO_HANDOFF.md`:

- Product sentence: real-user manufacturing inventory PWA.
- User evidence: three primary users plus other viewers; Excel manual update was the prior workflow.
- Core workflow: current stock check, in/out recording, history review, notification support.
- Feedback loop: raw-material management added after user request.
- Engineering evidence: Supabase Auth/profile, SWR, domain stock formatting, `create_transaction` RPC, PWA/push.
- Boundaries: no unverified metrics, no AI positioning, no company/person identifiers, no strong RLS/concurrency claims.

