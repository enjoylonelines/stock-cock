import { supabase } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// 재고 업데이트 헬퍼 함수
async function updateInventory(productOptionId: string, warehouseId: string, quantityChange: number) {
  const { data: inventory, error: invError } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_option_id", productOptionId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (invError) {
    console.error("[INVENTORY SELECT ERROR]", invError);
    throw invError;
  }

  const newQty = (inventory?.quantity ?? 0) + quantityChange;

  if (inventory) {
    const { error: updateError } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", inventory.id);

    if (updateError) {
      console.error("[INVENTORY UPDATE ERROR]", updateError);
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from("inventory").insert([
      {
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: quantityChange,
      },
    ]);

    if (insertError) {
      console.error("[INVENTORY INSERT ERROR]", insertError);
      throw insertError;
    }
  }
}

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
    try {
      const notificationTitle = "재고 조정 완료";
      const notificationBody = `${items.length}개 제품의 재고가 조정되었습니다`;

      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          icon: "/icons/icon-192x192.png",
          tag: `adjust-${transaction.id}`,
          data: {
            type: "adjustment",
            transactionId: transaction.id,
          },
        }),
      });
    } catch (notificationError) {
      console.error("푸시 알림 전송 실패:", notificationError);
      // 푸시 알림 실패는 전체 프로세스를 중단시키지 않음
    }

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    console.error("[ADJUSTMENT UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "조정 처리 실패", detail: String(error) }, { status: 500 });
  }
}
