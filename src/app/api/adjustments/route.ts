import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/services/push-notification";
import { updateInventory } from "@/utils/inventory";
import { getProductIconUrl } from "@/utils/product-icon";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type AdjustmentItemInput = {
  quantity: number;
  unit_price: number;
  option_id: string;
  expiration_date: string | null;
};

type AdjustmentInput = {
  warehouse_id: string;
  memo?: string;
  created_at?: string;
  items: AdjustmentItemInput[];
  user_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body: AdjustmentInput = await request.json();
    const { warehouse_id, memo, created_at, items, user_id } = body;

    console.log("[ADJUSTMENT REQUEST BODY]", body);

    if (!items.length) throw new Error("Invalid request body: Missing items");

    // [1] 트랜잭션 기록
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          type: "adjust",
          to_warehouse_id: warehouse_id,
          memo,
          created_at,
          user_id,
        },
      ])
      .select()
      .single();

    if (txError) {
      console.error("[TX ERROR]", txError);
      throw txError;
    }

    for (const item of items) {
      console.log("[ADJUSTMENT ITEM PROCESSING]", item);

      // [2] 배치 insert (조정용)
      const { data: batch, error: batchError } = await supabase
        .from("inventory_batches")
        .insert([
          {
            product_option_id: item.option_id,
            warehouse_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            expiration_date: item.expiration_date || null,
          },
        ])
        .select()
        .single();

      if (batchError) {
        console.error("[BATCH ERROR]", batchError);
        throw batchError;
      }

      // [3] inventory 조정 (목표 재고로 설정)
      const { data: currentInventory, error: currentInvError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_option_id", item.option_id)
        .eq("warehouse_id", warehouse_id)
        .maybeSingle();

      if (currentInvError) {
        console.error("[CURRENT INVENTORY SELECT ERROR]", currentInvError);
        throw currentInvError;
      }

      const currentQuantity = currentInventory?.quantity ?? 0;
      const adjustmentQuantity = item.quantity - currentQuantity; // 목표 재고 - 현재 재고 = 조정량

      await updateInventory(item.option_id, warehouse_id, adjustmentQuantity);

      // [4] transaction_items 기록 (조정량 기록)
      const { error: itemError } = await supabase.from("transaction_items").insert([
        {
          transaction_id: transaction.id,
          product_option_id: item.option_id,
          batch_id: batch.id,
          quantity: adjustmentQuantity, // 조정량 기록
          unit_price: item.unit_price,
        },
      ]);

      if (itemError) {
        console.error("[ITEM INSERT ERROR]", itemError);
        throw itemError;
      }
    }

    // 푸시 알림 전송
    const firstOptionId = items[0]?.option_id;
    const iconUrl = firstOptionId ? await getProductIconUrl(firstOptionId) : undefined;
    await sendPushNotification({
      title: "재고 조정 완료",
      body: `${items.length}개 제품의 재고가 조정되었습니다`,
      icon: iconUrl,
      tag: `adjust-${transaction.id}`,
      data: {
        type: "adjustment",
        transactionId: transaction.id,
      },
    });

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    console.error("[ADJUSTMENT UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "조정 처리 실패", detail: String(error) }, { status: 500 });
  }
}
