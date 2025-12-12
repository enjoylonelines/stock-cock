import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/services/push-notification";
import { updateInventory } from "@/utils/inventory";
import { getProductIconUrl } from "@/utils/product-icon";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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
    const firstOptionId = items[0]?.option_id;
    const iconUrl = firstOptionId ? await getProductIconUrl(firstOptionId) : undefined;
    await sendPushNotification({
      title: "재고 이동 완료",
      body: `${items.length}개 제품이 이동되었습니다`,
      icon: iconUrl,
      tag: `move-${transaction.id}`,
      data: {
        type: "move",
        transactionId: transaction.id,
      },
    });

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    console.error("[MOVE UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "이동 처리 실패", detail: String(error) }, { status: 500 });
  }
}
