-- transaction_items 테이블에서 unit_price 컬럼 삭제
-- unit_price는 더 이상 사용되지 않음

-- 1. 먼저 뷰 삭제
DROP VIEW IF EXISTS "public"."transaction_history_view";

-- 2. unit_price 컬럼 삭제
ALTER TABLE "public"."transaction_items" DROP COLUMN IF EXISTS "unit_price";

-- 3. 뷰 재생성 (unit_price 없이)
CREATE VIEW "public"."transaction_history_view" AS
SELECT 
    t.id AS transaction_id,
    t.type,
    t.created_at,
    t.memo,
    u.name AS user_name,
    s.name AS supplier_name,
    w1.name AS from_warehouse_name,
    w2.name AS to_warehouse_name,
    ti.product_option_id,
    p.name AS product_name,
    po.weight,
    po.unit_label,
    ti.quantity
FROM (((((((public.transactions t
    JOIN public.transaction_items ti ON ((ti.transaction_id = t.id)))
    JOIN public.product_options po ON ((po.id = ti.product_option_id)))
    JOIN public.products p ON ((p.id = po.product_id)))
    LEFT JOIN public.profiles u ON ((u.id = t.user_id)))
    LEFT JOIN public.suppliers s ON ((s.id = t.supplier_id)))
    LEFT JOIN public.warehouses w1 ON ((w1.id = t.from_warehouse_id)))
    LEFT JOIN public.warehouses w2 ON ((w2.id = t.to_warehouse_id)))
ORDER BY t.created_at DESC;
