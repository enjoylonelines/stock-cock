#!/usr/bin/env python3
"""Selected strategy boundary checks, no retries or load escalation."""
import json, uuid, argparse
from decimal import Decimal
import run as r
import reference_harness as h

def snapshot(c,f):
    return {
      'inventory':c.execute('SELECT id,product_option_id,warehouse_id,quantity,weight_in_grams,updated_at FROM inventory WHERE warehouse_id=%s ORDER BY id',(f['warehouse'],)).fetchall(),
      'headers':c.execute('SELECT id,type,user_id,supplier_id,memo,created_at,from_warehouse_id,to_warehouse_id FROM transactions WHERE from_warehouse_id=%s OR to_warehouse_id=%s ORDER BY id',(f['warehouse'],f['warehouse'])).fetchall(),
      'items':c.execute('SELECT i.id,i.transaction_id,i.product_option_id,i.quantity FROM transaction_items i JOIN transactions t ON t.id=i.transaction_id WHERE t.from_warehouse_id=%s OR t.to_warehouse_id=%s ORDER BY i.id',(f['warehouse'],f['warehouse'])).fetchall()
    }
def single(c,name,material=False,change=None,error=None):
    f=h.fixture(c,100,material); f['options'].sort()
    op=h.operation(f,'regression-'+str(uuid.uuid4()),0,1,f['options'][:1])
    supplier=str(uuid.uuid4());c.execute('INSERT INTO suppliers(id,name) VALUES(%s,%s)',(supplier,'synthetic'))
    op['header'].update(supplier_id=supplier,created_at='2026-09-23T00:00:00Z')
    if change:change(c,f,op)
    before=snapshot(c,f)
    with h.connection('regression-worker',True) as w: request=h.invoke(w,op)
    after=snapshot(c,f)
    failures=[]
    if error:
        if request.get('sqlstate')!=error: failures.append('wrong_error')
        if json.dumps(before,default=str,sort_keys=True)!=json.dumps(after,default=str,sort_keys=True):
            failures.append('failed_transaction_mutated_state')
    else:
        if request['status']!='success':failures.append('expected_success')
        else:
            # Independent header and quantity check, including missing-row creation.
            rows=after['headers']
            if len(rows)!=1 or str(rows[0][2])!=f['user'] or str(rows[0][3])!=supplier or rows[0][4]!=op['operation_id'] or rows[0][5].isoformat()!='2026-09-23T00:00:00':
                failures.append('header_mismatch')
            expected_from= f['warehouse'] if op['header']['type']=='out' else None
            expected_to= f['warehouse'] if op['header']['type']=='in' else None
            if str(rows[0][0])!=request['response']['transaction_id'] or (str(rows[0][6]) if rows[0][6] else None)!=expected_from or (str(rows[0][7]) if rows[0][7] else None)!=expected_to:
                failures.append('header_direction_or_response_mismatch')
            initial={str(x[1]):Decimal(x[4] if material else x[3]) for x in before['inventory']}
            for item in op['items']:
                initial[item['option_id']]=initial.get(item['option_id'],Decimal(0))+Decimal(str(item['quantity']))*(1 if op['header']['type']=='in' else -1)
            final={str(x[1]):Decimal(x[4] if material else x[3]) for x in after['inventory']}
            if final!=initial:failures.append('stock_mismatch')
            if sorted((str(x[2]),x[3]) for x in after['items'])!=sorted((x['option_id'],Decimal(str(x['quantity']))) for x in op['items']):
                failures.append('items_mismatch')
    return dict(name=name,unit='g' if material else 'count',request=request,before=before,after=after,failures=failures)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);args=ap.parse_args()
    result={'cases':[]}
    def add(x):
        result['cases'].append(x)
        if x['failures']:raise RuntimeError('stop on regression failure: '+x['name'])
    try:
      with h.connection('regression-admin') as c:
        r.guard(c);r.install(c,r.SELECTED);result['environment']=r.meta(c)
        result['sql_hash']=r.digest(r.SELECTED)
        # The extra boundary workload is paired on baseline/selected, separate from old P0.
        specs=[(u,k,'natural' if k in ('C0','C4') else 'row-lock-gate') for u in ('count','g') for k in ('C0','C3','C4','C5')]
        result['boundary_runs']=[]
        for name,path in [('baseline',r.BASELINE),('selected',r.SELECTED)]:
            x=r.execute(c,name,path,specs,1)
            for t in x['trials']:
                if t['case']=='C5' and any(y['status']!='success' for y in t['requests']):
                    t['failures'].append('C5_requires_two_successes')
            result['boundary_runs'].append(x)
            if name=='selected' and any(t['failures'] for t in x['trials']):raise RuntimeError('boundary failure')
        def qty(q): return lambda c,f,o:o['items'][0].update(quantity=q)
        for q in (0,-1):
            add(single(c,'nonpositive-'+str(q),change=qty(q),error='22023'))
        add(single(c,'fractional-count',change=qty(0.5)))
        add(single(c,'fractional-g',True,qty(1.5),'22023'))
        add(single(c,'g-input-overflow',True,qty(2147483648),'22023'))
        def overflow(c,f,o):c.execute('UPDATE inventory SET weight_in_grams=2147483647 WHERE product_option_id=%s',(f['options'][0],))
        add(single(c,'g-result-overflow',True,overflow,'22023'))
        def duplicate(c,f,o):o['items'].append(dict(o['items'][0]))
        add(single(c,'duplicate-item',change=duplicate,error='22023'))
        add(single(c,'malformed-option',change=lambda c,f,o:o['items'][0].update(option_id='not-a-uuid'),error='22023'))
        add(single(c,'invalid-type',change=lambda c,f,o:o['header'].update(type='move'),error='22023'))
        add(single(c,'unknown-option',change=lambda c,f,o:o['items'][0].update(option_id=str(uuid.uuid4())),error='23503'))
        add(single(c,'unit-mismatch',True,lambda c,f,o:o['items'][0].update(product_type='company'),'22023'))
        add(single(c,'material-type-omitted',True,lambda c,f,o:o['items'][0].pop('product_type')))
        for kind in ('franchise','pb'):
            def product_kind(c,f,o,kind=kind):
                c.execute('UPDATE products SET product_type=%s WHERE id=(SELECT product_id FROM product_options WHERE id=%s)',(kind,f['options'][0]))
                o['items'][0]['product_type']=kind
            add(single(c,kind+'-count',change=product_kind))
        for unit in (False,True):
            def missing_in(c,f,o):c.execute('DELETE FROM inventory WHERE product_option_id=%s',(f['options'][0],))
            def missing_out(c,f,o):missing_in(c,f,o);o['header']['type']='out'
            add(single(c,'missing-stock-out',unit,missing_out,'P0002'))
            add(single(c,'new-stock-in',unit,missing_in))
            def insufficient(c,f,o):
                o['header']['type']='out';o['items'].append(dict(o['items'][0],option_id=f['options'][1]))
                c.execute('UPDATE inventory SET '+('weight_in_grams' if unit else 'quantity')+'=0 WHERE product_option_id=%s',(f['options'][1],))
            add(single(c,'second-item-insufficient',unit,insufficient,'P0001'))
        def duplicate_row(c,f,o):
            c.execute('INSERT INTO inventory(product_option_id,warehouse_id,quantity) VALUES(%s,%s,100)',(f['options'][0],f['warehouse']))
        add(single(c,'duplicate-inventory',change=duplicate_row,error='P0003'))
        for val,name in [(None,'null'),(-1,'negative'),(Decimal('NaN'),'nan')]:
            def invalid(c,f,o,val=val):c.execute('UPDATE inventory SET quantity=%s WHERE product_option_id=%s',(val,f['options'][0]))
            add(single(c,'invalid-stock-'+name,change=invalid,error='P0003'))
        add(single(c,'inactive-unit-pollution',change=lambda c,f,o:c.execute('UPDATE inventory SET weight_in_grams=1 WHERE product_option_id=%s',(f['options'][0],)),error='P0003'))
        # A real FK failure after a successful first update/item insertion.
        c.execute("""CREATE TABLE inventory_test_fk_target(id uuid PRIMARY KEY);
          CREATE TABLE inventory_test_fk_child(id uuid REFERENCES inventory_test_fk_target(id));
          CREATE FUNCTION inventory_test_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN
            IF NEW.product_option_id::text=current_setting('inventory_test.fail_option',true) THEN
              INSERT INTO inventory_test_fk_child VALUES(NEW.product_option_id);
            END IF;
            RETURN NEW;
          END $$;
          CREATE TRIGGER inventory_test_fail_item BEFORE INSERT ON transaction_items
            FOR EACH ROW EXECUTE FUNCTION inventory_test_fail_item();""")
        for material in (False,True):
            f=h.fixture(c,100,material);f['options'].sort()
            op=h.operation(f,'fk-trigger-'+str(uuid.uuid4()),0,1,f['options'][:2])
            before=snapshot(c,f)
            with h.connection('fk-worker',True) as w:
                w.execute("SELECT set_config('inventory_test.fail_option',%s,false)",(f['options'][1],))
                response=h.invoke(w,op)
            after=snapshot(c,f)
            add(dict(name='real-FK-after-first-item',unit='g' if material else 'count',request=response,
                before=before,after=after,failures=[] if response.get('sqlstate')=='23503' and before==after else ['FK rollback failure']))
        c.execute('DROP TRIGGER inventory_test_fail_item ON transaction_items; DROP FUNCTION inventory_test_fail_item(); DROP TABLE inventory_test_fk_child,inventory_test_fk_target')
    except Exception as e:result['blocked']=str(e)
    h.write_result(args.output,result)
    print(json.dumps({'output':args.output,'cases':len(result['cases']),'blocked':result.get('blocked'),
       'failures':sum(bool(x['failures']) for x in result['cases'])}))
    return 2 if result.get('blocked') else 0
if __name__=='__main__':raise SystemExit(main())
