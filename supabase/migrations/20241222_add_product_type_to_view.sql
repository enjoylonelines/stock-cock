-- 1. products 테이블에 product_type 컬럼 추가 (아직 없다면)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type TEXT 
CHECK (product_type IN ('company', 'franchise', 'pb')) 
DEFAULT 'company';

-- 2. product_type 컬럼에 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- 3. product_option_inventory_view 뷰 재생성 (product_type 포함)
-- 기존 뷰가 있다면 삭제
DROP VIEW IF EXISTS product_option_inventory_view;

-- 뷰 재생성 (product_type 필드 포함)
CREATE OR REPLACE VIEW product_option_inventory_view AS
SELECT 
    po.id AS product_option_id,
    po.sku,
    po.weight,
    po.unit_label,
    po.box_unit,
    po.buy_price,
    po.sell_price,
    p.id AS product_id,
    p.name AS product_name,
    b.name AS brand_name,
    c.name AS category_name,
    p.product_type,
    p.image_url,
    i.id AS inventory_id,
    COALESCE(i.quantity, 0) AS quantity,
    w.id AS warehouse_id,
    w.name AS warehouse_name
FROM product_options po
INNER JOIN products p ON po.product_id = p.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory i ON i.product_option_id = po.id
LEFT JOIN warehouses w ON i.warehouse_id = w.id;

-- 뷰에 대한 설명 추가
COMMENT ON VIEW product_option_inventory_view IS '제품 옵션, 재고 정보, 제품 유형을 포함한 통합 뷰';

