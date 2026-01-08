import { supabase } from "@/lib/supabase";

const DEFAULT_ICON = "/icons/logo-192x192.png";

/**
 * 제품 ID를 통해 제품 아이콘 URL을 가져옵니다.
 * @param productId 제품 ID
 * @returns 아이콘 URL (기본값: /icons/logo-192x192.png)
 */
export async function getProductIconUrlByProductId(productId: string): Promise<string> {
  try {
    const { data: productRow, error: productErr } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", productId)
      .maybeSingle();

    if (productErr || !productRow?.image_url) {
      return DEFAULT_ICON;
    }

    return productRow.image_url;
  } catch {
    return DEFAULT_ICON;
  }
}

/**
 * 제품 옵션 ID를 통해 제품 아이콘 URL을 가져옵니다.
 * @param optionId 제품 옵션 ID
 * @returns 아이콘 URL (기본값: /icons/logo-192x192.png)
 */
export async function getProductIconUrl(optionId: string): Promise<string> {
  try {
    // 1) option -> product_id 조회
    const { data: optionRow, error: optionErr } = await supabase
      .from("product_options")
      .select("product_id")
      .eq("id", optionId)
      .maybeSingle();

    if (optionErr || !optionRow?.product_id) {
      return DEFAULT_ICON;
    }

    // 2) 재사용: getProductIconUrlByProductId 호출
    return await getProductIconUrlByProductId(optionRow.product_id);
  } catch {
    return DEFAULT_ICON;
  }
}
