import { supabase } from "@/lib/supabase";
import type { ProductOption } from "@/types/database";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { product, options } = body; // product: { name, ... }, options: [{ option_value }, ...]

  // 1. products 테이블에 insert
  const { data: productData, error: productError } = await supabase
    .from("products")
    .insert([product])
    .select()
    .single();

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
  try {
    const notificationTitle = "새 제품 등록";
    const notificationBody = `${product.name} 제품이 등록되었습니다 (${options.length}개 옵션)`;
    // 아이콘: 제품 이미지 시도 후 실패 시 기본값 사용
    let iconUrl = "/icons/logo-192x192.png";
    try {
      // 제품 생성 시점에 product.image_url이 있을 수 있음
      if (productData?.image_url) {
        iconUrl = productData.image_url;
      }
    } catch (_) {}

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: iconUrl,
        tag: `product-${productData.id}`,
        data: {
          type: "product",
          productId: productData.id,
          productName: product.name,
        },
      }),
    });
  } catch (notificationError) {
    console.error("푸시 알림 전송 실패:", notificationError);
    // 푸시 알림 실패는 전체 프로세스를 중단시키지 않음
  }

  return NextResponse.json({ success: true, product: productData });
}
