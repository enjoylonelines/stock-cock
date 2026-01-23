import { createClient } from "@/lib/supabase/server";
import { sendPushNotification } from "@/services/push-notification";
import type { ProductCreateInput } from "@/types/api";
import type { ProductOption } from "@/types/database";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { getProductIconUrlByProductId } from "@/utils/product-icon";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const endpoint = "/api/product";

  try {
    const supabase = await createClient();
    const body: ProductCreateInput = await req.json();
    const { product, options } = body;

    apiLogger.requestStart(endpoint, body);

    if (!product || !product.name) {
      throw APIError.badRequest("제품 정보가 필요합니다.");
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      throw APIError.badRequest("제품 옵션이 필요합니다.");
    }

    // 1. products 테이블에 insert
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (productError) {
      apiLogger.dbError("제품 생성", productError);
      throw APIError.fromSupabaseError(productError);
    }

    // 2. product_options 테이블에 insert
    const productId = productData.id;
    const optionsWithProductId = options.map(opt => ({
      ...opt,
      product_id: productId,
    }));

    const { error: optionError } = await supabase.from("product_options").insert(optionsWithProductId);

    if (optionError) {
      apiLogger.dbError("제품 옵션 생성", optionError);
      throw APIError.fromSupabaseError(optionError);
    }

    // 푸시 알림 전송 (실패해도 전체 프로세스를 중단하지 않음)
    try {
      const iconUrl = await getProductIconUrlByProductId(productData.id);
      await sendPushNotification({
        title: "새 제품 등록",
        body: `${product.name} 제품이 등록되었습니다 (${options.length}개 옵션)`,
        icon: iconUrl !== "/icons/logo-192x192.png" ? iconUrl : undefined,
        tag: `product-${productData.id}`,
        data: {
          type: "product",
          productId: productData.id,
          productName: product.name,
        },
      });
    } catch (notificationError) {
      apiLogger.requestError(endpoint, notificationError, { context: "푸시 알림 전송 실패" });
      // 푸시 알림 실패는 전체 프로세스를 중단시키지 않음
    }

    apiLogger.requestSuccess(endpoint, { product_id: productData.id });
    return NextResponse.json({ success: true, product: productData });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
