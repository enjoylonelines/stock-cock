# DB-authoritative inventory mutation boundary decision

Status: implementation direction authorized; final human interpretation,
adoption/rejection, and Changed belief are pending human decision.

The authorized direction is a DB-owned delta mutation path for operational
movements and a distinct reason + expected-version absolute-adjustment contract.
This record does not decide remaining writer migration, authorization, audit
retention, retry, or idempotency policy.

Evidence: `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md`.

## Decision required

The move's two legs and canonical ledger are intentionally one server
transaction in code. The authorized isolated-DB run now passed the fixed
two-session same-source move, insufficient-stock, trigger-injected rollback,
and ledger-reconciliation cases. This closes that move-specific validation
cycle; it does not decide a retry/idempotency policy or broader operational
claims.

A human still must decide whether absolute adjustment becomes one server
transaction containing both its canonical adjustment ledger entry and its
expected-version audit, or whether the currently documented two-call adjustment
boundary is acceptable.

Authorization/retention for `actor_id` and `inventory_adjustment_audit`, direct
DML exceptions for provisioning/warehouse deletion, and whether an adjustment
may set a negative target remain separate product-policy questions. Human
interpretation, adoption/rejection, and Changed belief remain pending human
decision.
