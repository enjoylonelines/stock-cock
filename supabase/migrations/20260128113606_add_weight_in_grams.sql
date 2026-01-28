-- 원재료 중량 컬럼 분리 마이그레이션
-- 문제: 완제품(봉지 수)과 원재료(kg)가 같은 quantity 컬럼 사용하여 단위 혼재
-- 해결: weight_in_grams 컬럼 추가, 원재료는 g 단위로 저장

-- 1. product_option_inventory_view 뷰 먼저 삭제 (컬럼 의존성 때문에)
DROP VIEW IF EXISTS public.product_option_inventory_view;

-- 2. inventory 테이블에 weight_in_grams 컬럼 추가
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS weight_in_grams INTEGER;

-- 3. 원재료 데이터 마이그레이션
-- 100 미만은 kg로 간주하여 1000 곱함, 100 이상은 g로 간주
UPDATE public.inventory i
SET weight_in_grams = CASE
    WHEN i.quantity < 100 THEN ROUND(i.quantity * 1000)::INTEGER
    ELSE ROUND(i.quantity)::INTEGER
END
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.product_type = 'material'
AND i.quantity IS NOT NULL;

-- 4. 원재료의 quantity를 NULL로 설정
UPDATE public.inventory i
SET quantity = NULL
FROM public.product_options po
JOIN public.products p ON po.product_id = p.id
WHERE i.product_option_id = po.id
AND p.product_type = 'material';

-- 5. product_option_inventory_view 뷰 재생성 (weight_in_grams 포함)
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
    i.weight_in_grams,
    w.id AS warehouse_id,
    w.name AS warehouse_name
FROM public.product_options po
INNER JOIN public.products p ON po.product_id = p.id
LEFT JOIN public.brands b ON p.brand_id = b.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.inventory i ON i.product_option_id = po.id
LEFT JOIN public.warehouses w ON i.warehouse_id = w.id;

-- 뷰에 대한 설명 업데이트
COMMENT ON VIEW public.product_option_inventory_view IS '제품 옵션, 재고 정보(완제품: quantity, 원재료: weight_in_grams), 제품 유형, 보관방식, 원산지를 포함한 통합 뷰';

-- 6. weight_in_grams 인덱스 추가 (원재료 재고 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_inventory_weight_in_grams ON public.inventory(weight_in_grams) WHERE weight_in_grams IS NOT NULL;
