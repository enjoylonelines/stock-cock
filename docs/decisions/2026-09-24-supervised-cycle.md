# Supervised cycle decision: cross-writer writer contract

Status: pending human decision; no option adopted.

## Options for human decision after evidence

1. Require all inventory writers to use a delta-only database contract.
2. Require a consistent row-lock-before-read contract for read-compute-write
   writers, including multi-row lock ordering.
3. Require a shared pair advisory-lock contract before read/write decisions.
4. Use optimistic version checking and explicitly define conflict/retry behavior.
5. Use serializable transactions and explicitly define safe retry/idempotency
   behavior.
6. Retain the current RPC-scoped guarantee and explicitly accept that external
   writers can violate the global reconciliation invariant.

No option is selected here. Human interpretation, adoption/rejection, and
Changed belief remain `pending human decision`.

Evidence link: `docs/evidence/2026-09-24-supervised-cycle.md`.

## Decision required

After an authorized run in the already existing isolated DB has captured the
planned snapshots and lock waits, choose whether to retain the current
RPC-scoped guarantee or establish one explicit contract for every inventory
writer. Do not infer adoption from the static counterexample, and do not add a
global policy in this cycle.

Human interpretation, adoption/rejection, and Changed belief remain `pending
human decision`.
