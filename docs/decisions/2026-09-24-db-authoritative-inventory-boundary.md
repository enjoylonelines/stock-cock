# DB-authoritative inventory mutation boundary decision

Status: implementation direction authorized; final human interpretation,
adoption/rejection, and Changed belief are pending human decision.

The authorized direction is a DB-owned delta mutation path for operational
movements and a distinct reason + expected-version absolute-adjustment contract.
This record does not decide remaining writer migration, authorization, audit
retention, retry, or idempotency policy.

Evidence: `docs/evidence/2026-09-24-db-authoritative-inventory-boundary.md`.

## Decision required

The move's two legs and canonical ledger are now intentionally one server
transaction in code. After an authorized isolated-DB migration/RPC run, decide
whether absolute adjustment must also become one server transaction containing
both its canonical adjustment ledger entry and its expected-version audit, or
whether the currently documented two-call adjustment boundary is acceptable.

Authorization/retention for `actor_id` and `inventory_adjustment_audit`, direct
DML exceptions for provisioning/warehouse deletion, and whether an adjustment
may set a negative target remain separate product-policy questions. Human
interpretation, adoption/rejection, and Changed belief remain pending human
decision.
