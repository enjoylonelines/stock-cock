-- 인벤토리 히스토리를 가져오는 함수 (user 관계 포함)
CREATE OR REPLACE FUNCTION get_inventory_history()
RETURNS TABLE (
  id uuid,
  quantity numeric,
  receipt_id uuid,
  receipt_type text,
  receipt_created_at timestamptz,
  receipt_memo text,
  location_name text,
  user_id uuid,
  user_name text,
  user_avatar_url text,
  product_id uuid,
  product_name text,
  product_image_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id,
    ri.quantity,
    r.id as receipt_id,
    r.type as receipt_type,
    r.created_at as receipt_created_at,
    r.memo as receipt_memo,
    l.name as location_name,
    u.id as user_id,
    u.name as user_name,
    u.avatar_url as user_avatar_url,
    p.id as product_id,
    p.name as product_name,
    p.image_url as product_image_url
  FROM receipt_items ri
  LEFT JOIN receipts r ON ri.receipt_id = r.id
  LEFT JOIN locations l ON r.location_id = l.id
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN products p ON ri.product_id = p.id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql; 