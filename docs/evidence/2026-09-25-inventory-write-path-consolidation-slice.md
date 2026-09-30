# Inventory write-path consolidation(쓰기 경로 통합) vertical-slice(수직 슬라이스) evidence

Date: 2026-09-25  
Repository / branch / HEAD: `/Users/hb/Projects/inventory/checkout` / `inventory-consistency-reinforcement` / `e9ef299ca495081a33754fec35602c24c55f5369`  
Working-tree baseline: clean at initial inspection.  
Working-tree checkpoint: this slice has one modified route and three untracked slice files; no pre-existing dirty change was overwritten.  
Career OS(Career OS): not changed; this repository remains source of truth.

## Scope and implemented result

The selected smallest vertical slice(수직 슬라이스) is the existing move flow only:

```text
Client(클라이언트) → /api/moves → InventoryMoveApplicationService(재고 이동 애플리케이션 서비스)
→ InventoryMoveWriteContract(재고 이동 쓰기 계약) → create_inventory_move RPC(원격 프로시저 호출)
→ PostgreSQL transaction(포스트그레스 트랜잭션)
```

- `src/app/api/moves/route.ts` now maps its request into `InventoryMoveCommand` and calls `InventoryMoveApplicationService.execute`.
- `src/lib/inventory/move-application-service.ts` validates the command and invokes exactly one injected `InventoryMoveWriteContract`.
- The production writer remains `moveInventory`, which calls the existing `create_inventory_move` RPC once. The established DB transaction still owns move header, items, inventory legs, commit(커밋), and rollback(롤백).
- No schema/migration(스키마/마이그레이션), Redis(레디스), Kafka(카프카), queue(큐), FastAPI(파이썬 API 프레임워크), deployment(배포), or permission change was introduced.

## TDD and test-scope review

The new service contract test was added before route delegation and verifies:

1. one valid command reaches the injected single write contract once and preserves the transaction id;
2. same-warehouse, empty-item, and non-positive-quantity commands fail before any write;
3. writer failure propagates without a second command.

Executed in DevSpace Max(DevSpace Max):

```sh
pnpm exec jest --watchman=false --runInBand --runTestsByPath src/__tests__/move-application-service.test.ts src/__tests__/inventory.test.ts src/__tests__/inventory-mutation-migration.test.ts
pnpm exec biome check src/lib/inventory/move-application-service.ts src/app/api/moves/route.ts src/__tests__/move-application-service.test.ts
pnpm exec tsc --noEmit
git diff --check
```

Actual results:

- Jest(제스트): PASS — 3 suites, 13 tests, 0 snapshots; elapsed reported 0.41 s.
- Biome(바이옴): PASS — 3 files checked.
- TypeScript(타입스크립트): PASS — exit 0, no output.
- Diff whitespace check(변경 공백 검사): PASS — exit 0, no output.

This is unit/contract/static evidence. It establishes application wiring and preserves the tested RPC payload/result contract. It does not prove an HTTP request reached the DB, RLS(행 수준 보안), authorization(권한 부여), lock wait(잠금 대기), response-loss retry(응답 유실 재시도), idempotency(멱등성), production scale(운영 규모), or global writer consistency(전역 쓰기 경로 일관성).

## Counterexample and improvement boundary

The prior cross-writer stale absolute update(교차 쓰기 경로의 오래된 절대값 갱신) remains relevant: a non-participating absolute writer can overwrite a committed delta even while the move RPC is internally atomic. Its historical raw file is absent, so it is not newly claimed as live evidence.

This slice improves one migration seam: the move route has a named application boundary and a replaceable single contract. It does **not** eliminate product provisioning direct insert, recalculation orchestration, or the adjustment route's separate ledger/audit calls. The existing isolated direct-SQL evidence remains `tests/inventory/results/ledgered-move-live-20260924-v3.json`; it recorded a fixed same-source concurrency workload with observed lock wait, one successful 60-unit move, one insufficient-stock error, and matching persisted ledger/inventory state.

## Checkpoint

- Diff summary: modified `src/app/api/moves/route.ts`; added `src/lib/inventory/move-application-service.ts`, `src/__tests__/move-application-service.test.ts`, this evidence, and the linked plan.
- Tests run: the four commands above, all PASS.
- Evidence paths: this file; `tests/inventory/results/ledgered-move-live-20260924-v3.json`; `docs/evidence/2026-09-24-supervised-cycle.md`.
- Unresolved question: the supplied `user_id` is not a verified authenticated principal(인증 주체); no authorization boundary is implemented.
- Decision required: choose adjustment transaction coupling, authorized idempotency/retry policy, direct-DML(직접 데이터 조작) exception list, and the isolated DB dual-run/migration gate before broader migration.
- Human decision: pending human decision.
- Changed belief: pending human decision.
- Stop condition: met. The authorized one-flow Application Service(애플리케이션 서비스) candidate and focused validation are complete. Do not begin adjacent writer migration automatically.
