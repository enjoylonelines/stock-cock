#!/usr/bin/env python3
"""Disposable-DB regression for approval-gated inventory document lifecycle."""
import argparse
import json
import uuid
from pathlib import Path

from psycopg.types.json import Jsonb

import reference_harness as h
import run as r


def as_actor(c, actor_id):
    c.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (actor_id,))


def call(c, sql, args=()):
    return c.execute(sql, args).fetchone()[0]


def expect_error(c, sql, args, code, message):
    try:
        c.execute(sql, args)
    except Exception as exc:
        assert getattr(exc, "sqlstate", None) == code, exc
        assert str(exc).splitlines()[0] == message, exc
        return
    raise AssertionError(f"expected {code}:{message}")


def fixture(c):
    requester, approver, other = [str(uuid.uuid4()) for _ in range(3)]
    warehouse, product, option, supplier = [str(uuid.uuid4()) for _ in range(4)]
    for user, name in ((requester, "requester"), (approver, "approver"), (other, "other")):
        c.execute("INSERT INTO auth.users(id) VALUES (%s)", (user,))
        c.execute("INSERT INTO profiles(id,name) VALUES (%s,%s)", (user, name))
    c.execute("INSERT INTO approval_roles(user_id,role) VALUES (%s,'approver')", (approver,))
    c.execute("INSERT INTO warehouses(id,name) VALUES (%s,%s)", (warehouse, "document-workflow"))
    c.execute("INSERT INTO products(id,name,product_type) VALUES (%s,%s,'company')", (product, "document-product"))
    c.execute("INSERT INTO product_options(id,product_id,sku) VALUES (%s,%s,%s)", (option, product, option))
    c.execute("INSERT INTO suppliers(id,name) VALUES (%s,%s)", (supplier, "sales-counterparty"))
    return dict(requester=requester, approver=approver, other=other, warehouse=warehouse, option=option, supplier=supplier)


def create(c, f, actor, quantity, key=None):
    as_actor(c, actor)
    return call(c, "SELECT public.create_inventory_document(%s::jsonb,%s::jsonb)", (
        Jsonb(dict(document_type="in", warehouse_id=f["warehouse"], memo="document-regression",
                   idempotency_key=key or str(uuid.uuid4()))),
        Jsonb([dict(option_id=f["option"], quantity=quantity)]),
    ))


def create_sale(c, f, actor, quantity, sales_amount, key=None):
    as_actor(c, actor)
    return call(c, "SELECT public.create_sales_inventory_document(%s::jsonb,%s::jsonb)", (
        Jsonb(dict(document_type="out", warehouse_id=f["warehouse"], supplier_id=f["supplier"],
                   memo="sales-document-regression", sales_amount=sales_amount,
                   idempotency_key=key or str(uuid.uuid4()))),
        Jsonb([dict(option_id=f["option"], quantity=quantity)]),
    ))


def count(c, table, document_id=None):
    if document_id:
        return c.execute(f"SELECT count(*) FROM public.{table} WHERE document_id=%s", (document_id,)).fetchone()[0]
    return c.execute(f"SELECT count(*) FROM public.{table}").fetchone()[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--output",
        default=f"/tmp/stock-cock-inventory-document-workflow-{uuid.uuid4()}.json",
        help="Optional result path; defaults to a unique file under /tmp.",
    )
    args = ap.parse_args()
    result = dict(experiment="inventory document approval lifecycle; disposable DB only", checks=[], failures=[])
    try:
        with h.connection("document-workflow-admin") as admin:
            r.guard(admin)
            policy_index = admin.execute(
                "SELECT to_regclass('public.inventory_product_option_warehouse_unique')"
            ).fetchone()[0]
            if policy_index is None:
                r.install(admin, r.POLICY)
            source = admin.execute(
                "SELECT prosrc FROM pg_proc WHERE oid='public.create_transaction(jsonb,jsonb)'::regprocedure"
            ).fetchone()[0]
            assert "pg_advisory_xact_lock" in source
            user = h.connection("document-workflow-user", True)
            f = fixture(admin)
            transaction_count_before = count(admin, "transactions")

            first = create(user, f, f["requester"], 7)
            doc = first["document_id"]
            assert first["idempotent_replay"] is False
            assert count(admin, "transactions") == transaction_count_before
            assert admin.execute(
                "SELECT count(*) FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                (f["option"], f["warehouse"]),
            ).fetchone()[0] == 0
            as_actor(user, f["requester"])
            assert user.execute("SELECT count(*) FROM inventory_documents WHERE id=%s", (doc,)).fetchone()[0] == 1
            as_actor(user, f["other"])
            assert user.execute("SELECT count(*) FROM inventory_documents WHERE id=%s", (doc,)).fetchone()[0] == 0
            as_actor(user, f["approver"])
            assert user.execute("SELECT count(*) FROM inventory_documents WHERE id=%s", (doc,)).fetchone()[0] == 1
            listed = call(user, "SELECT public.list_inventory_documents()")
            assert listed["can_approve"] is True
            assert any(item["id"] == doc for item in listed["documents"])
            result["checks"].append("draft_is_non_mutating_and_visible_only_to_requester_or_approver")

            as_actor(user, f["requester"])
            submitted = call(user, "SELECT public.submit_inventory_document(%s)", (doc,))
            assert submitted["status"] == "PENDING_APPROVAL"
            assert count(admin, "transactions") == transaction_count_before
            expect_error(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (doc,),
                         "42501", "INVENTORY_DOCUMENT_APPROVER_REQUIRED")
            result["checks"].append("submit_is_non_mutating_and_non_approver_rejected")

            as_actor(user, f["approver"])
            reflected = call(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (doc,))
            assert reflected["status"] == "REFLECTED" and reflected["idempotent_replay"] is False
            replay = call(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (doc,))
            assert replay["idempotent_replay"] is True
            assert replay["transaction_id"] == reflected["transaction_id"]
            assert count(admin, "transactions") == transaction_count_before + 1
            balance = admin.execute(
                "SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                (f["option"], f["warehouse"]),
            ).fetchone()[0]
            assert balance == 7
            audit = admin.execute(
                "SELECT event_type FROM inventory_document_audit WHERE document_id=%s ORDER BY created_at,id", (doc,)
            ).fetchall()
            assert [x[0] for x in audit] == ["CREATED", "SUBMITTED", "APPROVED_AND_REFLECTED"]
            result["checks"].append("distinct_approver_reflects_once_via_canonical_transaction")

            # A user may hold the approver role too, but can never approve their own request.
            admin.execute("INSERT INTO approval_roles(user_id,role) VALUES (%s,'approver')", (f["requester"],))
            key = str(uuid.uuid4())
            draft = create(user, f, f["requester"], 2, key)
            replay_draft = create(user, f, f["requester"], 99, key)
            assert replay_draft["document_id"] == draft["document_id"] and replay_draft["idempotent_replay"] is True
            assert count(admin, "inventory_document_lines", draft["document_id"]) == 1
            as_actor(user, f["requester"])
            call(user, "SELECT public.submit_inventory_document(%s)", (draft["document_id"],))
            as_actor(user, f["requester"])
            expect_error(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (draft["document_id"],),
                         "42501", "INVENTORY_DOCUMENT_SELF_APPROVAL_FORBIDDEN")
            assert count(admin, "transactions") == transaction_count_before + 1
            result["checks"].append("create_idempotency_and_self_approval_guard")

            cancel_doc = create(user, f, f["requester"], 1)["document_id"]
            as_actor(user, f["requester"])
            call(user, "SELECT public.submit_inventory_document(%s)", (cancel_doc,))
            call(user, "SELECT public.cancel_inventory_document(%s)", (cancel_doc,))
            as_actor(user, f["approver"])
            expect_error(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (cancel_doc,),
                         "P0001", "INVENTORY_DOCUMENT_NOT_APPROVABLE")
            assert count(admin, "transactions") == transaction_count_before + 1
            result["checks"].append("cancelled_document_cannot_reflect")

            rejected_doc = create(user, f, f["requester"], 1)["document_id"]
            as_actor(user, f["requester"])
            call(user, "SELECT public.submit_inventory_document(%s)", (rejected_doc,))
            as_actor(user, f["approver"])
            call(user, "SELECT public.reject_inventory_document(%s,%s)", (rejected_doc, "quantity mismatch"))
            assert admin.execute("SELECT status FROM inventory_documents WHERE id=%s", (rejected_doc,)).fetchone()[0] == "REJECTED"
            assert count(admin, "transactions") == transaction_count_before + 1
            result["checks"].append("rejection_keeps_inventory_unchanged")

            sale_key = str(uuid.uuid4())
            sale = create_sale(user, f, f["requester"], 3, 12000, sale_key)
            sale_create_replay = create_sale(user, f, f["requester"], 3, 12000, sale_key)
            assert sale_create_replay["document_id"] == sale["document_id"]
            assert sale_create_replay["idempotent_replay"] is True
            as_actor(user, f["requester"])
            call(user, "SELECT public.submit_inventory_document(%s)", (sale["document_id"],))
            as_actor(user, f["approver"])
            sale_reflected = call(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (sale["document_id"],))
            sale_replay = call(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (sale["document_id"],))
            assert sale_replay["idempotent_replay"] is True
            assert sale_replay["transaction_id"] == sale_reflected["transaction_id"]
            assert count(admin, "transactions") == transaction_count_before + 2
            projection = admin.execute(
                "SELECT transaction_id,counterparty_id,sales_amount,outstanding_amount "
                "FROM sales_receivable_projections WHERE inventory_document_id=%s", (sale["document_id"],)
            ).fetchall()
            assert len(projection) == 1
            transaction_id, counterparty_id, sales_amount, outstanding_amount = projection[0]
            assert str(transaction_id) == sale_reflected["transaction_id"]
            assert str(counterparty_id) == f["supplier"]
            assert sales_amount == 12000 and outstanding_amount == 12000
            balance = admin.execute(
                "SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                (f["option"], f["warehouse"]),
            ).fetchone()[0]
            assert balance == 4
            result["checks"].append("approved_sale_creates_one_receivable_projection_and_replay_is_non_mutating")

            insufficient_sale = create_sale(user, f, f["requester"], 5, 20000)
            as_actor(user, f["requester"])
            call(user, "SELECT public.submit_inventory_document(%s)", (insufficient_sale["document_id"],))
            as_actor(user, f["approver"])
            expect_error(user, "SELECT public.approve_and_reflect_inventory_document(%s)", (insufficient_sale["document_id"],),
                         "P0001", "INSUFFICIENT_STOCK")
            assert count(admin, "transactions") == transaction_count_before + 2
            assert admin.execute(
                "SELECT count(*) FROM sales_receivable_projections WHERE inventory_document_id=%s",
                (insufficient_sale["document_id"],),
            ).fetchone()[0] == 0
            assert admin.execute(
                "SELECT quantity FROM inventory WHERE product_option_id=%s AND warehouse_id=%s",
                (f["option"], f["warehouse"]),
            ).fetchone()[0] == 4
            result["checks"].append("insufficient_sale_leaves_transaction_receivable_and_inventory_unchanged")
    except Exception as exc:
        result["failures"].append(f"{type(exc).__name__}: {exc}")
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(dict(output=args.output, checks=result["checks"], failures=result["failures"])))
    raise SystemExit(2 if result["failures"] else 0)


if __name__ == "__main__":
    main()
