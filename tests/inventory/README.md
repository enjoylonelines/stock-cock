# Inventory consistency verification

Scope: existing SKU/warehouse rows, concurrent in/out RPC calls, READ COMMITTED.
No deployment, performance benchmark, automatic retry, or global inventory safety claim.

## Reproduce in a disposable environment

Requires Docker + standalone docker-compose, Python 3.12 and pnpm (repository lockfile).
All test credentials are synthetic. Ports 55439 (PG) and 55440 (PostgREST) must be free.
Do not adapt this runner to a production DSN. The Python connection is fixed to loopback and
guards the test database/user/marker; setup refuses a nonempty public schema.
The DB uses tmpfs: stopping/removing it discards data. Raw JSON is retained on the host.

```sh
docker-compose -f tests/inventory/compose.yaml up -d --build
python3 -m venv tests/inventory/.venv
tests/inventory/.venv/bin/python -m pip install -r tests/inventory/requirements.txt
tests/inventory/.venv/bin/python tests/inventory/run.py setup --output /tmp/inventory-setup-new.json
tests/inventory/.venv/bin/python tests/inventory/run.py compare --output /tmp/inventory-compare-new.json
tests/inventory/.venv/bin/python tests/inventory/run.py retest --output /tmp/inventory-retest-new.json
tests/inventory/.venv/bin/python tests/inventory/regression.py --output /tmp/inventory-regression-new.json
INVENTORY_DB_INTEGRATION=1 pnpm exec jest --runInBand --runTestsByPath tests/inventory/api.integration.test.ts
tests/inventory/.venv/bin/python tests/inventory/migration_verify.py --output /tmp/inventory-migration-new.json
docker-compose -f tests/inventory/compose.yaml stop
```

Python output paths use exclusive creation; choose new paths on subsequent runs.
The opt-in integration suite writes api-integration-<run UUID>.json so later runs preserve earlier evidence. The original api-integration.json is the recorded verification run.
migration_verify intentionally destroys/replays the guarded disposable schema, after checking
upgrade → old function restoration → selected function reapply. Run after other DB tests.
Only restore the old function in the test environment: it reintroduces known defects.

setup replays all 13 original migrations with real pg_cron and auth/storage test stubs.
Cron jobs are installed but launching is disabled. Clean verification replays all14 including
the selected migration. This is not a full Supabase auth/storage/gateway installation.
The integration suite calls the real route handler in process and the actual Supabase SDK,
PostgREST and PG. Cookie-based client creation and notifications are mocked; the standalone
PostgREST path prefix is adapted. No actual Next server/session authentication is tested.

## Evidence and acceptance

- compare.json: baseline vs locking read candidate A vs atomic update candidate B.
- retest.json: same eight unit/scenario combinations repeated three times per version.
- regression-verified.json: paired C0/C3/C4/C5 boundaries and27 individual contract checks.
- regression.json: retained first attempt; Python Decimal NaN != NaN caused a false
  snapshot-change failure. SQL returned the expected P0003, raw before/after are identical.
  The checker comparison was corrected, product SQL was not changed.
- api-integration.json: actual HTTP RPC response mapping and database effects.
- migration-verify.json: restore/upgrade/clean14 replay and scoped smoke/catalog.
- setup.json: initial13 migration manifest and runtime version.

A zero runner exit code alone is not an overall PASS. Inspect correctness failures,
coverage_failures, blocked state and raw gate proof. Natural schedules may finish too fast
to observe simultaneous DB activity; never count those as proven overlap. Selected variants
stop on correctness failure. Baseline continues only the predeclared tiny trials needed
for paired evidence; no stress escalation occurs.

C4's invalid option is last in the selected function's sorted processing order; its error is
an explicit23503 guard. Separate test-only trigger cases inject a real FK23503 after the first
item was applied and verify whole-batch rollback. No production trigger is added.
The reference_harness module retains the original P0 helper provenance; run.py uses its
connection/fixture/trial/oracle helpers, not its legacy baseline checkout checker.

Candidate A and B are test-only alternatives. Only migration20260923000000 is product code.
No unique constraint/upsert is added; concurrent creation of missing rows and other writers
(moves, adjustments, recalculate/direct table writes) remain outside this guarantee.
Do not blindly retry uncertain outcomes: there is no business idempotency key.

See [result report](../../docs/INVENTORY_CONSISTENCY_RESULTS.md) and
[plan](../../docs/plans/STOCK_COCK_CONSISTENCY_REINFORCEMENT_PLAN.md).
