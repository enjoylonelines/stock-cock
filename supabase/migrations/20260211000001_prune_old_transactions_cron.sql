-- 90일 지난 입출고 내역 자동 삭제 (pg_cron, Supabase Pro 필요)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'prune-old-transactions',
  '0 3 * * *',
  $$
  DELETE FROM transaction_items
  WHERE transaction_id IN (SELECT id FROM transactions WHERE created_at < NOW() - INTERVAL '90 days');
  DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
