-- push_subscriptions 테이블 제약조건 수정
-- 기존 잘못된 user_id 단일 유니크 제약조건 삭제
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- 올바른 (user_id, endpoint) 복합 유니크 제약조건 추가
-- 이미 마이그레이션에 있지만, 혹시 누락되었을 경우를 대비
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
UNIQUE (user_id, endpoint);
