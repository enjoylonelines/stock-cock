-- product_options 테이블에서 stock 컬럼을 cascade로 제거
ALTER TABLE product_options DROP COLUMN IF EXISTS stock CASCADE;

-- 기존 product_options의 stock 데이터를 inventory로 이전 (선택사항)
-- 이 부분은 기존 데이터가 있다면 실행하고, 없다면 주석 처리
/*
INSERT INTO inventory (product_id, location_id, quantity, created_at, updated_at)
SELECT 
  po.id as product_id,
  'default-location-id' as location_id, -- 기본 위치 ID로 설정
  po.stock as quantity,
  po.created_at,
  po.updated_at
FROM product_options po
WHERE po.stock > 0;
*/ 