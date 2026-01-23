-- 가격 제거 및 원재료 지원 마이그레이션

-- 1. product_option_inventory_view 뷰 먼저 삭제 (컬럼 의존성 때문에)
DROP VIEW IF EXISTS public.product_option_inventory_view;

-- 2. product_options 테이블에서 buy_price, sell_price 컬럼 제거
ALTER TABLE public.product_options 
DROP COLUMN IF EXISTS buy_price;

ALTER TABLE public.product_options 
DROP COLUMN IF EXISTS sell_price;

-- 3. products 테이블에 storage_type 컬럼 추가 (실온/냉장/냉동, NULL 허용)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS storage_type TEXT 
CHECK (storage_type IN ('room_temperature', 'refrigerated', 'frozen'));

-- 4. products 테이블에 origin 컬럼 추가 (원산지, NULL 허용)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS origin TEXT;

-- 5. products 테이블의 product_type CHECK 제약조건에 'material' 추가
-- 기존 제약조건 제거 후 재생성
ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products 
ADD CONSTRAINT products_product_type_check 
CHECK (product_type IN ('company', 'franchise', 'pb', 'material'));

-- 6. storage_type 필터링용 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_products_storage_type ON public.products(storage_type);

-- 7. product_option_inventory_view 뷰 재생성
-- buy_price, sell_price 제거하고 storage_type, origin 추가

CREATE OR REPLACE VIEW public.product_option_inventory_view AS
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
    p.storage_type,
    p.origin,
    p.image_url,
    i.id AS inventory_id,
    COALESCE(i.quantity, 0) AS quantity,
    w.id AS warehouse_id,
    w.name AS warehouse_name
FROM public.product_options po
INNER JOIN public.products p ON po.product_id = p.id
LEFT JOIN public.brands b ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.inventory i ON i.product_option_id = po.id
LEFT JOIN public.warehouses w ON i.warehouse_id = w.id;

-- 뷰에 대한 설명 추가
COMMENT ON VIEW public.product_option_inventory_view IS '제품 옵션, 재고 정보, 제품 유형, 보관방식, 원산지를 포함한 통합 뷰';
