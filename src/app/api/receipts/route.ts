import { sendPushNotification } from "@/services/push-notification";
import { getProductIconUrl } from "@/utils/product-icon";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

type ReceiptItemInput = {
  quantity: number;
  unit_price: number;
  option_id: string;
  expiration_date: string | null;
};

type ReceiptInput = {
  type: "in" | "out";
  warehouse_id: string;
  supplier_id?: string;
  memo?: string;
  created_at?: string;
  items: ReceiptItemInput[];
  user_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body: ReceiptInput = await request.json();
    const { type, warehouse_id, supplier_id, memo, created_at, items, user_id } = body;

    console.log("[REQUEST BODY]", body);

    if (!items.length) throw new Error("Invalid request body: Missing items");

    // [1] 트랜잭션 기록
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert([
        {
          type: type.toLowerCase() as "in" | "out",
          to_warehouse_id: type === "in" ? warehouse_id : null,
          from_warehouse_id: type === "out" ? warehouse_id : null,
          supplier_id,
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
      console.log("[ITEM PROCESSING]", item);
      console.log(item.option_id);

      // [2] 배치 insert (유통기한 기반)
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

      // [3] inventory upsert
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_option_id", item.option_id)
        .eq("warehouse_id", warehouse_id)
        .maybeSingle();

      if (invError) {
        console.error("[INVENTORY SELECT ERROR]", invError);
        throw invError;
      }

      let signedQty = item.quantity;
      if (type === "out") signedQty = -item.quantity;

      const newQty = (inventory?.quantity ?? 0) + signedQty;

      if (inventory) {
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity: newQty })
          .eq("id", inventory.id);

        if (updateError) {
          console.error("[INVENTORY UPDATE ERROR]", updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from("inventory").insert([
          {
            product_option_id: item.option_id,
            warehouse_id,
            quantity: newQty,
          },
        ]);

        if (insertError) {
          console.error("[INVENTORY INSERT ERROR]", insertError);
          throw insertError;
        }
      }

      // [4] transaction_items 기록
      const { error: itemError } = await supabase.from("transaction_items").insert([
        {
          transaction_id: transaction.id,
          product_option_id: item.option_id,
          batch_id: batch.id,
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
      title: type === "in" ? "입고 완료" : "출고 완료",
      body: `${items.length}개 제품이 ${type === "in" ? "입고" : "출고"}되었습니다`,
      icon: iconUrl,
      tag: `receipt-${transaction.id}`,
      data: {
        type: "receipt",
        transactionId: transaction.id,
        receiptType: type,
      },
    });

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    console.error("[UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "입고/출고 처리 실패", detail: String(error) }, { status: 500 });
  }
}
