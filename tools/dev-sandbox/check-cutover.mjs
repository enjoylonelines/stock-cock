// Rehearse the full upgrade from the prior schema inside a rollback-only transaction.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const migration=readFileSync("supabase/migrations/20261109063911_append_only_transaction_corrections.sql","utf8");
const tests=readFileSync("supabase/tests/append_only_transaction_corrections.sql","utf8").replace(/^BEGIN;\n/,"").replace(/ROLLBACK;\s*$/,"");
const prepare=`
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DROP VIEW IF EXISTS public.effective_transactions;
DROP VIEW public.transaction_history_view;
DROP SCHEMA stock_internal CASCADE;
DROP TABLE public.transaction_resolutions, public.transaction_memo_notes;
DROP FUNCTION public.resolve_transaction(uuid,text,jsonb,text,uuid);
DROP FUNCTION public.post_inventory_transaction(jsonb,jsonb);
ALTER TABLE public.transactions DROP COLUMN posted_at;
ALTER TABLE public.transaction_items DROP COLUMN product_name_snapshot,DROP COLUMN product_type_snapshot,DROP COLUMN weight_snapshot,DROP COLUMN unit_label_snapshot;
DROP INDEX public.inventory_option_warehouse_unique;
DROP POLICY stock_read_transactions ON public.transactions;
DROP POLICY stock_read_items ON public.transaction_items;
DROP POLICY stock_read_inventory ON public.inventory;
`;
const sql=prepare+`\n`+migration+`\n`+tests+`\nROLLBACK;`;
const output=execFileSync("docker",["exec","-i","supabase_db_stock-cock-management-dev","psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],{input:sql,encoding:"utf8"});
console.log(output);
