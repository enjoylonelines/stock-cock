---
name: Testing Patterns for 한끼재고
description: Effective Supabase mock patterns, known risky areas, and domain-specific edge cases discovered in this codebase
type: project
---

## Supabase Mock Patterns

### Standard chainable query mock (select + eq + eq + maybeSingle)
Used for `updateInventory` / `setInventory` which do `.select("*").eq(...).eq(...).maybeSingle()`:
```typescript
const selectMock = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
    }),
  }),
});
```

### Update mock (single .eq chained after .update)
Used for `inventory` updates which do `.update({...}).eq("id", inventory.id)`:
```typescript
const updateMock = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
});
```

### Thenable queryBuilder mock (for conditional .in() chains)
Used for `sendPushDirect` which does `.select("*")` then optionally `.in("user_id", userIds)` then `await query`:
```typescript
const queryBuilder = {
  in: jest.fn().mockReturnThis(),
  then: (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve),
  catch: (reject: (e: unknown) => void) => Promise.resolve(resolvedValue).catch(reject),
  finally: (fn: () => void) => Promise.resolve(resolvedValue).finally(fn),
};
```
Key: the thenable pattern is needed because `query` is awaited directly (not `.then()` explicitly).

### web-push mock
```typescript
jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));
import webpush from "web-push";
const mockSendNotification = webpush.sendNotification as jest.Mock;
```

## Known Risky Areas

### create_transaction RPC (as of 2026-04)
No client-side duplicate prevention. Double-click submit can fire two RPC calls. No deduplication guard exists at the UI or API layer.

### sendPushDirect error behavior
Throws the raw Supabase error object (not wrapped in `new Error()`). Use `rejects.toMatchObject(dbError)` not `rejects.toThrow(...)`.

### updateInventory isMaterial branch
Uses `weight_in_grams` field (integer grams). The null-coalesce `?? 0` means a null `weight_in_grams` is treated as 0g — this is intentional but worth regression-testing.

### setInventory (원재료)
Always sets `quantity: null` alongside `weight_in_grams` in the update payload — this enforces the material/finished product invariant at the DB level.

## Domain Boundary Values
- weight_in_grams: stored as integer grams, displayed as kg. 0g is valid (empty stock).
- Negative quantityChange / weightChange are valid inputs (출고/consumption).
- setInventory is an absolute set (not delta) — used only for adjustments (조정).
- updateInventory is a delta operation — used for 입고/출고/이동.

## Test File Locations
- `src/__tests__/inventory.test.ts` — updateInventory + setInventory (Jest)
- `src/__tests__/push-notification.test.ts` — sendPushDirect (Jest)
- `src/__tests__/api-error.test.ts` — APIError class
- `src/__tests__/api-handler.test.ts` — handleAPIError
- `src/__tests__/transaction-notification.test.ts` — sendTransactionNotification
