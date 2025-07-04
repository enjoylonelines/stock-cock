import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { CreateReceiptRequest, CreateReceiptItem } from "@/types/receipt";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();

    // if (authError || !user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = (await request.json()) as CreateReceiptRequest;
    const { type, location_id, supplier_id, memo, items, created_at } = body;

    // 1. 입고 데이터 생성
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        type,
        location_id,
        supplier_id,
        memo,
        status: "COMPLETED",
        user_id: items[0].user_id,
        created_at,
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    // 2. 입고 상세 항목 생성
    const receiptItems = items.map((item: CreateReceiptItem) => ({
      receipt_id: receipt.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: itemsError } = await supabase.from("receipt_items").insert(receiptItems);

    if (itemsError) throw itemsError;

    // 3. 재고 업데이트
    for (const item of items) {
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_id", item.product_id)
        .eq("location_id", location_id)
        .single();

      if (inventoryError && inventoryError.code !== "PGRST116") throw inventoryError;

      if (inventory) {
        // 기존 재고가 있는 경우 업데이트
        const newQuantity = type === "IN" ? inventory.quantity + item.quantity : inventory.quantity - item.quantity;

        const { error: updateError } = await supabase.from("inventory").update({ quantity: newQuantity }).eq("id", inventory.id);

        if (updateError) throw updateError;
      } else {
        // 새로운 재고 생성
        const { error: insertError } = await supabase.from("inventory").insert({
          product_id: item.product_id,
          location_id,
          quantity: type === "IN" ? item.quantity : -item.quantity,
        });

        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({ success: true, data: receipt });
  } catch (error) {
    console.error("Error creating receipt:", error);
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 });
  }
}
