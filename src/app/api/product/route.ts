import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ProductOption } from "@/types/database";
import { sendPushNotification } from "@/services/push-notification";
import { getProductIconUrlByProductId } from "@/utils/product-icon";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product, options } = body; // product: { name, ... }, options: [{ option_value }, ...]

  // 1. products 테이블에 insert
  const { data: productData, error: productError } = await supabase.from("products").insert([product]).select().single();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  // 2. product_options 테이블에 insert
  const productId = productData.id;
  const optionsWithProductId = options.map((opt: ProductOption) => ({
    ...opt,
    product_id: productId,
  }));

  const { error: optionError } = await supabase.from("product_options").insert(optionsWithProductId);

  if (optionError) {
    return NextResponse.json({ error: optionError.message }, { status: 500 });
  }

  // 푸시 알림 전송
  const iconUrl = await getProductIconUrlByProductId(productData.id);
  await sendPushNotification({
    title: "새 제품 등록",
    body: `${product.name} 제품이 등록되었습니다 (${options.length}개 옵션)`,
    icon: iconUrl,
    tag: `product-${productData.id}`,
    data: {
      type: "product",
      productId: productData.id,
      productName: product.name,
    },
  });

  return NextResponse.json({ success: true, product: productData });
}
