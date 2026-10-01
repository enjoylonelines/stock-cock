# Stock Cock Real-User Case Study

> Status: U2 draft after Confirmation 1
> Scope: real-user product evidence only
> Last reviewed: 2026-08-16

## Summary

Stock Cock is a Korean PWA inventory management service built for a small manufacturing workflow. It should be positioned as a real-user product and operations project, not as an AI project.

The service replaced a manual Excel-based inventory update workflow with a web-based flow for checking and updating current stock. The primary users are three manufacturing-side roles: operator, field manager, and inventory manager. Other members also check inventory when needed, but the full active-user count and usage frequency are not claimed here.

## User Context

| Item | Status | Evidence |
|---|---|---|
| Primary users | `[user_confirmed]` | Operator, field manager, and inventory manager are the three primary users. |
| Other viewers | `[user_confirmed]` | Other members also check inventory when needed. |
| App profile count | `[deployed]` | Supabase `profiles` HEAD/count check found 11 app profiles. This is an app profile count, not a direct Supabase Auth Admin count. |
| Company or personal identity | restricted | Do not disclose company name, personal names, internal stock amounts, or sales data. |

## Before Adoption

Before Stock Cock, inventory was updated manually in Excel. Because updates depended on manual entry, current stock was hard to keep accurate and the workflow was difficult to manage reliably.

Claim status: `[user_confirmed]`

## Most-Used Workflow

The most frequently used workflow is stock quantity management.

In product terms, this maps to:

- checking current inventory
- recording stock changes
- reviewing stock-related history
- managing finished goods and materials in the same product flow

Claim status: `[user_confirmed]` for usage, `[code_verified]` for inventory and transaction implementation paths.

## Feedback and Product Response

The first product scope was centered on finished goods. Actual user feedback requested support for managing raw materials as well. The product was expanded to include material inventory, using gram-based storage and formatting for raw materials while keeping finished goods in unit counts.

| Feedback | Response | Status |
|---|---|---|
| Manage raw materials in addition to finished goods | Added material product type and material inventory handling | `[user_confirmed]`, `[code_verified]` |
| Keep stock quantity management practical for daily use | Current stock and transaction flows remain the core workflow | `[user_confirmed]`, `[code_verified]` |

Code and migration evidence:

- `supabase/migrations/20260123020355_remove_prices_and_add_material_support.sql`
- `supabase/migrations/20260128113606_add_weight_in_grams.sql`
- `src/lib/domain/stock.ts`
- `src/lib/domain/format.ts`
- `src/utils/inventory.ts`

## Current Technical Evidence

| Claim | Status | Evidence |
|---|---|---|
| Live demo is deployed | `[deployed]` | `https://stock-cock.vercel.app` responds and redirects to `/auth/signin`. |
| Supabase-backed operational data exists | `[deployed]` | Remote Supabase REST HEAD/count showed non-empty product, warehouse, inventory, transaction, transaction item, profile, and push subscription tables. Row contents were not read or disclosed. |
| PWA support exists in code | `[code_verified]` | `next.config.ts`, `public/manifest.json`, `worker/index.ts`, and iOS meta tags in `src/app/layout.tsx`. |
| Push notification implementation exists | `[code_verified]`, partially `[test_verified]` | `src/services/push-notification.ts`, `src/hooks/usePushNotifications.ts`, `src/utils/transaction-notification.ts`, and focused push tests. |
| In/out transactions use RPC | `[code_verified]` | `src/app/api/transactions/route.ts` calls `create_transaction`; migrations define and later fix the RPC signature. |
| Move/adjustment RPC support | `[work_in_progress]` | Dirty route changes and untracked migration exist, but this case study does not claim them as complete. |
| RLS or role-based authorization | `[unknown]` | Admin role separation was considered, but current permissions are not claimed as role-separated. Avoid strong RLS claims until verified. |

## Public Portfolio Copy

Safe short version:

> Built a Korean PWA inventory management service for a small manufacturing workflow that moved stock tracking away from manual Excel updates. The service is used primarily by an operator, a field manager, and an inventory manager, with other members checking inventory as needed. Based on real user feedback, the product was expanded from finished-goods inventory to raw-material inventory management.

Safe Korean version:

> 엑셀 수기 업데이트로 최신 재고 수량을 맞추기 어려웠던 제조 현장 업무를 위해, Next.js와 Supabase 기반 PWA 재고관리 서비스를 만들었습니다. 운영자, 현장 관리자, 재고 담당자 3명이 주 사용자로 사용 중이며, 그 외 구성원도 필요 시 재고를 조회합니다. 실제 사용 피드백을 바탕으로 완제품 중심 관리에서 원재료 재고 관리까지 확장했습니다.

## Do Not Claim Yet

- Do not claim a specific total Supabase Auth signup count unless checked through Supabase Auth Admin or dashboard.
- Do not claim total active users, DAU/WAU, usage frequency, or retention.
- Do not claim time saved, percentage efficiency improvement, revenue impact, or stockout reduction.
- Do not claim complete role-based authorization or admin permissions.
- Do not claim move/adjustment RPC atomicity as production-verified.
- Do not claim full concurrency control or negative-stock prevention.
- Do not disclose company name, personal names, inventory amounts, or internal sales data.

## Next Validation Needed

Before using stronger engineering claims, validate the following separately:

- Supabase Auth user count from dashboard or service-role Admin API.
- Whether every Auth user has exactly one profile in production.
- Production RLS and permission boundaries.
- Move and adjustment RPC signature, migration application, and focused tests.
- DB integration behavior for rollback, negative stock, and concurrent updates.

