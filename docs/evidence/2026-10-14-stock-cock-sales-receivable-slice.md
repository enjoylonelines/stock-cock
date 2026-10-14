# Stock-Cock 판매·미수금 최소 슬라이스 실행 기록

## Scope

이 기록은 disposable PostgreSQL에서 승인 전표의 판매 출고가 기존 재고 writer와 같은 DB transaction으로 미수금 projection을 남기는지 확인한 결과다. 외부 ERP API, 실제 회계 분개·세금·결제, outbox/재시작 복구, 운영 데이터는 범위 밖이다.

## Environment and command

- Checkout: `main` at `46ae1c3`; 실행 시점에는 전표·판매 슬라이스를 포함한 미커밋 변경이 있었다.
- Database: `tests/inventory/compose.yaml`의 PostgreSQL 17 disposable DB (`127.0.0.1:55439`), synthetic UUID fixture.
- Setup: `uv run --with-requirements tests/inventory/requirements.txt python tests/inventory/run.py setup --output /tmp/stock-cock-sales-setup-20261014-1140.json`
- Execution: `pnpm test:inventory-documents`
- Raw result: `/tmp/stock-cock-inventory-document-workflow-f8650df9-05f9-4704-8463-ed7d3ed20239.json` (host-temporary; not a durable repository artifact).

## Result

The command exited successfully with `failures: []` and these eight checks:

1. draft is non-mutating and visible only to requester or approver
2. submit is non-mutating and non-approver is rejected
3. distinct approver reflects once through canonical transaction
4. creation idempotency and self-approval guard
5. cancelled document cannot reflect
6. rejection keeps inventory unchanged
7. approved sale creates one receivable projection and replay is non-mutating
8. insufficient sale leaves transaction, receivable, and inventory unchanged

The test installs and verifies the selected `20260924000000_enforce_inventory_pair_policy.sql` writer policy before running. This matters because the baseline setup intentionally omits that policy migration for historical A/B comparison; testing sales against the baseline writer would allow a false negative-stock result.

## Static checks

- `pnpm exec biome check` passed for the changed inventory-document API, UI, form, store, and service files.
- `git diff --check` passed.
- Repository-wide `pnpm exec tsc --noEmit` remains failing in pre-existing unrelated areas (ERP Lab union narrowing and older Supabase generated-type mismatches in adjustments, recalculation, product, and push paths). It reported no error in the changed inventory-document files, but this is not a clean full-repository typecheck.

## Limits and decision

The result establishes only a synthetic, single-process database contract: one approved outbound sales document maps to one canonical stock transaction and one unpaid receivable projection. It does not establish real accounting correctness, customer-master semantics, reporting latency, authorization in a deployed Next.js session, external integration, crash recovery, or production-scale concurrency.

Human decision and changed belief: pending.
