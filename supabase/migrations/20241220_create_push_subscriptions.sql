-- 푸시 알림 구독 정보 테이블
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS 정책 설정
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 푸시 구독만 관리할 수 있음
CREATE POLICY "사용자는 자신의 푸시 구독만 관리할 수 있음" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- updated_at은 수동으로 관리 (트리거 없음)
