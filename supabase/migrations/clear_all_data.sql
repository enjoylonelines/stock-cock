-- 모든 테이블의 데이터 삭제 스크립트 (상용화 전 초기화용)
-- 외래 키 제약 조건을 고려하여 순서대로 삭제합니다.
-- 주의: 이 스크립트는 모든 데이터를 영구적으로 삭제합니다!
-- 같은 이메일로 다시 가입할 수 있도록 auth.users도 함께 삭제합니다.

-- 1. 자식 테이블부터 삭제 (외래 키 참조가 있는 테이블)
TRUNCATE TABLE transaction_items CASCADE;
TRUNCATE TABLE inventory_batches CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE inventory CASCADE;
TRUNCATE TABLE product_options CASCADE;
TRUNCATE TABLE push_subscriptions CASCADE;
TRUNCATE TABLE user_read_status CASCADE;

-- 2. 메인 테이블 삭제
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE brands CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE warehouses CASCADE;

-- 3. 사용자 관련 테이블 삭제
-- profiles는 auth.users를 참조하므로 먼저 삭제
TRUNCATE TABLE profiles CASCADE;

-- 4. 레거시 테이블 (사용되지 않을 수 있음)
TRUNCATE TABLE receipts CASCADE;
TRUNCATE TABLE receipt_items CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE users CASCADE;

-- 5. auth.users 테이블 삭제 (같은 이메일로 다시 가입 가능하도록)
-- 주의: auth.users는 Supabase의 인증 시스템이 관리하는 테이블입니다.
-- 이 테이블을 삭제하면 같은 이메일로 다시 회원가입할 수 있습니다.
DELETE FROM auth.users;

-- 모든 데이터 삭제 완료
-- 참고: 뷰(product_option_inventory_view, transaction_history_view)는 데이터를 저장하지 않으므로 삭제할 필요가 없습니다.

