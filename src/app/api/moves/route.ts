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

type MoveItemInput = {
  quantity: number;
  unit_price: number;
  option_id: string;
};

type MoveInput = {
  from_warehouse_id: string;
  to_warehouse_id: string;
  memo?: string;
  created_at?: string;
  items: MoveItemInput[];
  user_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body: MoveInput = await request.json();
    const { from_warehouse_id, to_warehouse_id, memo, created_at, items, user_id } = body;

    console.log("[MOVE REQUEST BODY]", body);

    if (!items.length) throw new Error("Invalid request body: Missing items");
    if (from_warehouse_id === to_warehouse_id) throw new Error("출발지와 도착지는 같을 수 없습니다");

    // [1] 트랜잭션 기록
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          type: "move",
          from_warehouse_id,
          to_warehouse_id,
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
      console.log("[MOVE ITEM PROCESSING]", item);

      // 출발지 재고 차감
      await updateInventory(item.option_id, from_warehouse_id, -item.quantity);

      // 도착지 재고 추가
      await updateInventory(item.option_id, to_warehouse_id, item.quantity);

      // [2] transaction_items 기록 (배치 없이)
      const { error: itemError } = await supabase.from("transaction_items").insert([
        {
          transaction_id: transaction.id,
          product_option_id: item.option_id,
          batch_id: null, // 이동은 배치 없음
          quantity: item.quantity,
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
      const notificationTitle = "재고 이동 완료";
      const notificationBody = `${items.length}개 제품이 이동되었습니다`;

      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          icon: "/icons/icon-192x192.png",
          tag: `move-${transaction.id}`,
          data: {
            type: "move",
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
    console.error("[MOVE UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "이동 처리 실패", detail: String(error) }, { status: 500 });
  }
}
