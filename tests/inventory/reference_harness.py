#!/usr/bin/env python3
"""Root-controlled DB/RPC preparation. No workload runs by default; no retries."""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import uuid
from decimal import Decimal

BASE = Path(__file__).resolve().parent
REV = '239eb461611729f34ebb9ae345b5054e0d3e0255'
ENV = 'inventory-p0-239eb461-prep'
RPC = BASE / 'vendor/create_transaction.sql'
SOURCE = 'supabase/migrations/20260131110000_fix_create_transaction_rpc_signature.sql'
CONFIG = dict(host='127.0.0.1', port=55439, dbname='inventory_p0_test',
              user='inventory_p0_test', password='inventory-p0-test-only',
              connect_timeout=3, sslmode='disable')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def connection(name, worker=False):
    # Reject ambient libpq routing/credentials rather than silently inheriting them.
    if any(k.startswith('PG') for k in os.environ):
        raise RuntimeError('Unset ambient PG* variables; only hardcoded test endpoint is allowed')
    import psycopg
    c = psycopg.connect(**CONFIG, application_name='inventory-p0-' + name, autocommit=True)
    c.execute("SET statement_timeout='8s'")
    c.execute("SET lock_timeout='5s'")
    c.execute("SET default_transaction_isolation='read committed'")
    if worker:
        c.execute('SET ROLE authenticated')
    return c


def verify_db(c):
    row = c.execute('SELECT name, mode FROM public.inventory_p0_environment').fetchone()
    if row != (ENV, 'minimal-substitute'):
        raise RuntimeError('Wrong environment marker; refusing fixture writes')
    return dict(zip(('database', 'user', 'version', 'isolation', 'max_connections'),
                    c.execute("SELECT current_database(), current_user, version(), "
                              "current_setting('transaction_isolation'), current_setting('max_connections')").fetchone()))


def checkout_evidence():
    p = BASE.parent / 'checkout'
    def git(*args):
        return subprocess.check_output(['git', '-C', str(p), *args], text=True).strip()
    if not (p / '.git').exists():
        raise RuntimeError('checkout missing; clone/AGENTS review required before DB preparation')
    rev, dirty = git('rev-parse', 'HEAD'), git('status', '--porcelain=v1')
    if rev != REV or dirty:
        raise RuntimeError('Baseline revision differs or checkout is dirty; root must review')
    if (p / SOURCE).read_bytes() != RPC.read_bytes():
        raise RuntimeError('Vendored SQL differs from checkout RPC')
    migrations = {f.name: digest(f) for f in sorted((p / 'supabase/migrations').glob('*.sql'))}
    return {'revision': rev, 'dirty': dirty, 'migration_hashes': migrations}


def fixture(c, initial, material):
    ids = [str(uuid.uuid4()) for _ in range(13)]
    user, warehouse, product, *options = ids
    c.execute('INSERT INTO auth.users(id) VALUES (%s)', (user,))
    c.execute('INSERT INTO profiles(id,name) VALUES (%s,%s)', (user, 'inventory-p0-test'))
    c.execute('INSERT INTO warehouses(id,name) VALUES (%s,%s)', (warehouse, 'inventory-p0-test'))
    kind = 'material' if material else 'company'
    c.execute('INSERT INTO products(id,name,product_type) VALUES (%s,%s,%s)', (product, 'inventory-p0-test', kind))
    for option in options:
        c.execute('INSERT INTO product_options(id,product_id,sku) VALUES (%s,%s,%s)', (option, product, option))
        c.execute('INSERT INTO inventory(product_option_id,warehouse_id,quantity,weight_in_grams) VALUES (%s,%s,%s,%s)',
                  (option, warehouse, None if material else initial, initial if material else None))
    return dict(user=user, warehouse=warehouse, options=options, material=material, initial=initial)


def operation(f, prefix, index, delta, options):
    return {'operation_id': prefix + ':' + str(index), 'attempt_id': str(uuid.uuid4()), 'retry': 0,
            'header': {'type': 'in' if delta > 0 else 'out', 'user_id': f['user'],
                       'warehouse_id': f['warehouse'], 'memo': prefix + ':' + str(index)},
            'items': [{'option_id': o, 'quantity': abs(delta),
                       'product_type': 'material' if f['material'] else 'company'} for o in options]}


def invoke(c, op, barrier=None):
    from psycopg.types.json import Jsonb
    record = {'operation_id': op['operation_id'], 'attempt_id': op['attempt_id'],
              'retry': 0, 'backend_pid': c.info.backend_pid, 'ready_ns': time.monotonic_ns(),
              'before': 'unknown', 'after': 'unknown'}
    if barrier:
        barrier.wait(timeout=10)
    record['start_ns'] = time.monotonic_ns()
    try:
        record['response'] = c.execute('SELECT public.create_transaction(%s::jsonb,%s::jsonb)',
                                      (Jsonb(op['header']), Jsonb(op['items']))).fetchone()[0]
        record['status'] = 'success'
    except Exception as e:
        record.update(status='error', sqlstate=getattr(e, 'sqlstate', None), error=str(e))
    record['end_ns'] = time.monotonic_ns()
    record['query_latency_ms'] = (record['end_ns'] - record['start_ns']) / 1e6
    return record


def observe(c, pids):
    rows = c.execute("SELECT pid,state,wait_event_type,wait_event,pg_blocking_pids(pid),query_start,query "
                     "FROM pg_stat_activity WHERE pid=ANY(%s)", (pids,)).fetchall()
    locks = c.execute('SELECT pid,locktype,mode,granted,relation::regclass::text,transactionid::text '
                      'FROM pg_locks WHERE pid=ANY(%s)', (pids,)).fetchall()
    count = c.execute('SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()').fetchone()[0]
    return {'sample_ns': time.monotonic_ns(), 'activity': rows, 'locks': locks, 'connections': count}


def concurrent_pair(admin, f, ops, mode):
    # Worker connections are established before the three-party release barrier.
    timing = {}
    barrier = threading.Barrier(3, action=lambda: timing.update(release_ns=time.monotonic_ns()))
    samples, errors, records = [], [], []
    with connection('worker-0', True) as a, connection('worker-1', True) as b, connection('gate') as gate:
        pids = [a.info.backend_pid, b.info.backend_pid]
        gate_evidence = {'pid': gate.info.backend_pid, 'inventory_ids': [], 'released_ns': None}
        gate.execute('BEGIN')
        if mode == 'row-lock-gate':
            gate_evidence['inventory_ids'] = gate.execute(
                'SELECT id FROM inventory WHERE warehouse_id=%s FOR UPDATE', (f['warehouse'],)).fetchall()
            gate_evidence['transaction_id'] = gate.execute('SELECT txid_current()').fetchone()[0]
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(invoke, c, op, barrier) for c, op in zip((a, b), ops)]
                barrier.wait(timeout=10)
                deadline = time.monotonic() + 2
                released = mode == 'natural'
                if released:
                    gate.execute('ROLLBACK')
                while not all(x.done() for x in futures):
                    try:
                        s = observe(admin, pids)
                        samples.append(s)
                        waiting = {r[0] for r in s['activity'] if r[1] == 'active' and r[2] == 'Lock'}
                    except Exception as e:
                        errors.append(str(e))
                        waiting = set()
                    if not released and (waiting == set(pids) or time.monotonic() >= deadline):
                        gate.execute('ROLLBACK')
                        gate_evidence['released_ns'] = time.monotonic_ns()
                        released = True
                    time.sleep(0.002)
                records = [x.result() for x in futures]
        finally:
            gate.execute('ROLLBACK')
    both = lambda s: len([r for r in s['activity'] if r[0] in pids and r[1] == 'active'
                         and 'SELECT public.create_transaction' in r[6]]) == 2
    return records, {'barrier_parties': 3, 'release_ns': timing['release_ns'], 'worker_pids': pids,
        'gate': gate_evidence,
        'client_intervals_overlap': max(r['start_ns'] for r in records) < min(r['end_ns'] for r in records),
        'actual_rpc_overlap_observed': any(both(s) for s in samples),
        'both_lock_wait_observed': any(both(s) and all(r[2] == 'Lock' for r in s['activity']) for s in samples),
        'select_stage_overlap': 'not_measured; row-lock-gate waits support inference, not SELECT timestamps',
        'sampling_interval_target_ms': 2, 'samples': samples, 'observation_errors': errors,
        'lock_query_observed': bool(samples),
        'lock_observed': any(s['locks'] for s in samples), 'connection_observed': bool(samples)}


def oracle(c, f, ops, records):
    """Independent arithmetic from persisted header/items, plus request/ledger equality."""
    rows = c.execute('SELECT t.id,t.memo,t.type,i.product_option_id,i.quantity '
                     'FROM transactions t LEFT JOIN transaction_items i ON i.transaction_id=t.id '
                     'WHERE t.to_warehouse_id=%s OR t.from_warehouse_id=%s', (f['warehouse'], f['warehouse'])).fetchall()
    actual = c.execute('SELECT product_option_id,quantity,weight_in_grams FROM inventory WHERE warehouse_id=%s',
                       (f['warehouse'],)).fetchall()
    ledger, expected = {}, {o: Decimal(f['initial']) for o in f['options']}
    for tid, memo, kind, option, qty in rows:
        entry = ledger.setdefault(memo, {'transaction_ids': set(), 'items': []})
        entry['transaction_ids'].add(str(tid))
        if option is not None:
            entry['items'].append((str(option), qty, kind))
            expected[str(option)] = expected.get(str(option), Decimal(0)) + qty * (1 if kind == 'in' else -1)
    failures = []
    if set(ledger) - {op['operation_id'] for op in ops}:
        failures.append('unexpected_ledger_operation')
    reconciliation = []
    for op, result in zip(ops, records):
        entry = ledger.get(op['operation_id'])
        persisted = sorted(entry['items']) if entry else []
        wanted = sorted((i['option_id'], Decimal(i['quantity']), op['header']['type']) for i in op['items'])
        state = 'committed' if entry else 'not_committed'
        reconciliation.append({'operation_id': op['operation_id'], 'commit_state': state, 'ledger': entry})
        if entry and (persisted != wanted or len(entry['transaction_ids']) != 1):
            failures.append('partial_or_duplicate_ledger:' + op['operation_id'])
        if result['status'] == 'success' and not entry:
            failures.append('success_without_ledger:' + op['operation_id'])
        if entry and result['status'] == 'success' and str(result['response'].get('transaction_id')) not in entry['transaction_ids']:
            failures.append('response_transaction_id_mismatch:' + op['operation_id'])
        if entry and result['status'] == 'error':
            failures.append('error_but_committed:' + op['operation_id'])
    seen = set()
    for option, qty, grams in actual:
        option = str(option)
        value = grams if f['material'] else qty
        if option in seen:
            failures.append('duplicate_inventory:' + option)
        seen.add(option)
        if value != expected.get(option):
            failures.append('ledger_balance_mismatch:' + option)
        if value is not None and value < 0:
            failures.append('negative:' + option)
    if seen != set(f['options']):
        failures.append('inventory_row_set_mismatch')
    return {'failures': failures, 'final': actual, 'expected_from_committed_ledger': expected,
            'ledger_rows': rows, 'reconciliation': reconciliation}


def trial(admin, case, material, mode):
    f = fixture(admin, 1 if case == 'C2' else 100, material)
    prefix = 'inventory-p0-' + str(uuid.uuid4())
    options = sorted(f['options'])
    specs = {'C0': [(10, options[:1]), (20, options[:1])],
             'C1': [(10, options[:1]), (20, options[:1])],
             'C2': [(-1, options[:1]), (-1, options[:1])],
             'C3': [(10, options[:1]), (-20, options[:1])],
             'C4': [(1, [options[0], 'ffffffff-ffff-ffff-ffff-ffffffffffff', *options[2:]]), (1, options)],
             'C5': [(10, options[:2]), (20, list(reversed(options[:2])))]}[case]
    ops = [operation(f, prefix, i, d, o) for i, (d, o) in enumerate(specs)]
    c4_before_recovery = None
    if case in ('C0', 'C4'):
        records = []
        with connection('sequential', True) as c:
            for op in ops:
                records.append(invoke(c, op))
                if case == 'C4' and len(records) == 1:
                    c4_before_recovery = oracle(admin, f, ops[:1], records)
        obs = {'actual_rpc_overlap_observed': False, 'reason': 'sequential control',
               'lock_observed': False, 'connection_observed': False}
    else:
        records, obs = concurrent_pair(admin, f, ops, mode)
    check = oracle(admin, f, ops, records)
    coverage_failures = []
    if case not in ('C0', 'C4') and not obs['actual_rpc_overlap_observed']:
        coverage_failures.append('actual_rpc_overlap_not_observed')
    if case not in ('C0', 'C4') and mode == 'row-lock-gate' and not obs['both_lock_wait_observed']:
        coverage_failures.append('both_lock_waits_not_observed_before_gate_release')
    if case == 'C5':
        check['boundary_outcomes'] = [{'status': r['status'], 'sqlstate': r.get('sqlstate')} for r in records]
        if all(r['status'] != 'success' for r in records):
            coverage_failures.append('C5_no_successful_request; root_must_classify_boundary')
    if case in ('C0', 'C1', 'C3') and any(r['status'] != 'success' for r in records):
        check['failures'].append('expected_two_successes')
    if case == 'C2':
        commits = sum(x['commit_state'] == 'committed' for x in check['reconciliation'])
        if commits != 1:
            check['failures'].append('outbound_available_stock_contract')
        rejected = [r for r in records if r['status']=='error']
        if commits == 1 and not (len(rejected)==1 and rejected[0].get('sqlstate')=='P0001'
                and rejected[0].get('error','').splitlines()[0]=='INSUFFICIENT_STOCK'):
            check['failures'].append('C2_not_insufficient_stock_rejection')
    if case == 'C4':
        check['before_recovery'] = c4_before_recovery
        check['failures'].extend('C4_rollback:' + e for e in c4_before_recovery['failures'])
        if records[0].get('sqlstate') != '23503' or records[1]['status'] != 'success':
            check['failures'].append('bulk_failure_or_recovery_contract')
        if c4_before_recovery['ledger_rows']:
            check['failures'].append('failed_bulk_header_or_items_persisted')
    return {'case': case, 'unit': 'g' if material else 'count', 'fixture': f, 'operations': ops,
            'requests': records, 'observation': obs, 'oracle': check, 'n': len(records),
            'failures': check['failures'], 'coverage_failures': coverage_failures, 'retries': 0}


def write_result(path, result):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    # Never overwrite previous evidence.
    with path.open('x') as out:
        json.dump(result, out, ensure_ascii=False, indent=2,
                  default=lambda x: sorted(x) if isinstance(x, set) else str(x))
        out.write('\n')

