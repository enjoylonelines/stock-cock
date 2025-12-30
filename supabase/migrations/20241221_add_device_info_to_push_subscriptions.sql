-- push_subscriptions 테이블에 디바이스 정보 컬럼 추가
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- device_id 인덱스 추가 (디바이스별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_id ON push_subscriptions(device_id);

-- 기존 endpoint 기반 유니크 제약조건은 유지 (브라우저별 endpoint는 다를 수 있음)
-- device_id가 NULL이 아닌 경우에만 (user_id, device_id) 복합 유니크 제약조건 적용
-- NULL 허용이므로 부분 유니크 인덱스는 PostgreSQL에서 직접 지원하지 않으므로
-- 애플리케이션 레벨에서 관리하거나, 트리거로 관리

-- 참고: device_id가 NULL인 경우는 기존 데이터이거나 device_id가 생성되지 않은 경우
-- 새로운 구독은 항상 device_id를 가지므로, 애플리케이션에서 중복 체크 수행

