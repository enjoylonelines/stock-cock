-- 개별 활동 읽음 상태 (카톡 방식) + 90일 지난 입출고 자동 삭제

-- 1. user_activity_read 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_activity_read (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_option_id uuid NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  CONSTRAINT user_activity_read_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_read_user_tx_opt_unique UNIQUE (user_id, transaction_id, product_option_id)
);

CREATE INDEX idx_user_activity_read_user_id ON public.user_activity_read USING btree (user_id);

-- RLS
ALTER TABLE public.user_activity_read ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own read status"
  ON public.user_activity_read
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity_read TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity_read TO service_role;

-- 2. 90일 지난 입출고 자동 삭제 cron (Supabase Pro에서 pg_cron 사용 시)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'prune-old-transactions',
--   '0 3 * * *',
--   $$
--   DELETE FROM transaction_items
--   WHERE transaction_id IN (SELECT id FROM transactions WHERE created_at < NOW() - INTERVAL '90 days');
--   DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '90 days';
--   $$
-- );
