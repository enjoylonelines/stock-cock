# ERP Domain Lab posting(전기) policy decision

Status: human decision recorded on 2026-10-06. This decision applies only to the isolated ERP Domain Lab; it does not change the existing Stock-Cock user application or database.

## Decisions

1. The Lab document lifecycle is `DRAFT → CONFIRMED → POSTED → REVERSED`.
   - `CONFIRMED` remains a distinct approval state and does not mutate the ledger or current-balance projection.
   - Only `POSTED` creates ledger entries and changes `InventoryBalance`.
   - `REVERSED` preserves the original posted document and adds compensating entries.
2. Warehouse movement is all-or-nothing. A failed item means no movement leg or movement document is posted.
3. Bulk receipt may report independent per-row success/failure. A failed row receives an explicit business error and does not post.
4. Every product type rejects a negative posted balance.

## Consequences

- DD-A1 must make status checks part of every write command and reconciliation query.
- The fixture and test suite need both an all-or-nothing movement case and an independently reported bulk-receipt case.
- Negative balance is an invariant violation, not a tolerated output or a later cleanup task.

## Still pending

- Human hypothesis and prediction for the selected transaction strategy.
- Authorization model for confirmation/posting.
- Idempotency-key retention window and caller identity binding.
- Product valuation, accounting entry, and period-close policy.

## Evidence

- `docs/evidence/2026-10-06-erp-domain-cycle-0-baseline.md`
- `docs/plans/2026-10-01-erp-domain-deep-dive.md`
