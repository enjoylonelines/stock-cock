import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
  const optionsWithProductId = options.map((opt) => ({
    ...opt,
    product_id: productId,
  }));

  const { error: optionError } = await supabase.from("product_options").insert(optionsWithProductId);

  if (optionError) {
    return NextResponse.json({ error: optionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, product: productData });
}
