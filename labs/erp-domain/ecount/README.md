# ECOUNT ERP Domain Lab

This directory is isolated from the existing Stock-Cock application. It explores
the smallest ERP inventory workflow: receipt, shipment, and transfer documents
move from `DRAFT` to `CONFIRMED` to `POSTED`; a later reversal preserves history.

## Current slice

- TypeScript keeps command validation and the workflow boundary explicit.
- PostgreSQL schema defines tenant-scoped documents, lines, ledger entries, and
  current balances.
- A future SQL adapter must post a confirmed document, its ledger entries, and
  the balance projection in one transaction.

No current result proves PostgreSQL posting, concurrent shipment handling, or
reconciliation. Those are the next isolated-harness tasks.
