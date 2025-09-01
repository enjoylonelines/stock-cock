-- 사용자별 읽음 상태 테이블
CREATE TABLE user_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_broadcast_id INTEGER NOT NULL DEFAULT 0,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX idx_user_read_status_user_id ON user_read_status(user_id);
CREATE INDEX idx_user_read_status_broadcast_id ON user_read_status(last_read_broadcast_id);

-- RLS 정책 설정
ALTER TABLE user_read_status ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 읽음 상태만 관리할 수 있음
CREATE POLICY "사용자는 자신의 읽음 상태만 관리할 수 있음" ON user_read_status
  FOR ALL USING (auth.uid() = user_id);

-- 기본값 삽입 (기존 사용자들을 위해)
INSERT INTO user_read_status (user_id, last_read_broadcast_id, read_at)
SELECT id, 0, NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
