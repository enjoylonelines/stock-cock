# ECOUNT ERP Domain Lab — Cycle 1.5 HTTP Vertical Slice

## Question

Cycle 1에서 SQL function과 Python harness로 검증한 전표 상태 전이와 원장·현재고 반영이,
TypeScript Web Backend의 HTTP 요청 경계에서도 같은 정책으로 동작하는가?

## Path

`POST /lab/erp/inventory-documents` → TypeScript command validation →
`PostgresInventoryDocumentPort` → PostgreSQL function → document / ledger /
balance, then `GET` returns the tenant-scoped detail. `confirm`, `post`, and
`reverse` use the same adapter boundary.

## Evidence

- raw result: `labs/erp-domain/ecount/evidence/2026-10-07-http-vertical-slice-v1.json`
- environment: fixed disposable loopback PostgreSQL Lab DB; local TypeScript
  process on `127.0.0.1`
- result: passed; reconciliation mismatches: `0`

The harness exercised:

1. `2 kg` material receipt → `2000 g` ledger delta and duplicate request
   returns the original document.
2. Empty lines return `400 INVALID_DOCUMENT_INPUT`; invalid material unit
   returns `400 INVALID_DOCUMENT_UNIT` with line index, `g`/`kg`, and base unit
   `g`. Correcting the same idempotency key creates a draft, so the rejected
   request did not reserve that key.
3. Oversized shipment returns `409 INSUFFICIENT_STOCK`; its document remains
   `CONFIRMED` and gets no ledger entry.
4. Another tenant's read returns `404 DOCUMENT_NOT_FOUND`.
5. Boxed receipt can be reversed; the original becomes `REVERSED` and the
   counter-document is posted.

## Boundary

This validates only a local HTTP process, fixed fixtures, and a disposable
database. It does not establish authentication/RLS, production connection
pooling, restart recovery, multi-worker global-write correctness, actual UI,
or external ECOUNT API integration.
