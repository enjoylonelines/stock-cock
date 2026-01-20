-- product_options 테이블에서 buy_price, sell_price 컬럼 제거
ALTER TABLE product_options 
DROP COLUMN IF EXISTS buy_price CASCADE,
DROP COLUMN IF EXISTS sell_price CASCADE;

-- product_option_inventory_view 뷰 재생성 (buy_price, sell_price 제거)
DROP VIEW IF EXISTS product_option_inventory_view;

CREATE OR REPLACE VIEW product_option_inventory_view AS
SELECT 
    po.id AS product_option_id,
    po.sku,
    po.weight,
    po.unit_label,
    po.box_unit,
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

-- 뷰에 대한 설명 업데이트
COMMENT ON VIEW product_option_inventory_view IS '제품 옵션, 재고 정보, 제품 유형을 포함한 통합 뷰 (가격 정보 제외)';

