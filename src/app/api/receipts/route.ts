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
        const { error: updateError } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", inventory.id);

        if (updateError) {
          console.error("[INVENTORY UPDATE ERROR]", updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from("inventory").insert([
          {
            product_option_id: item.option_id,
            warehouse_id,
            quantity: item.quantity,
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
    try {
      const notificationTitle = type === "in" ? "입고 완료" : "출고 완료";
      const notificationBody = `${items.length}개 제품이 ${type === "in" ? "입고" : "출고"}되었습니다`;
      // 아이콘: 제품 이미지 시도 후 실패 시 기본값 사용
      let iconUrl = "/icons/logo-192x192.png";
      try {
        // 대표로 첫 번째 아이템의 제품 이미지를 사용
        const firstOptionId = items[0]?.option_id;
        if (firstOptionId) {
          // 1) option -> product_id 조회
          const { data: optionRow, error: optionErr } = await supabase
            .from("product_options")
            .select("product_id")
            .eq("id", firstOptionId)
            .maybeSingle();

          if (!optionErr && optionRow?.product_id) {
            // 2) product_id -> image_url 조회
            const { data: productRow, error: productErr } = await supabase
              .from("products")
              .select("image_url")
              .eq("id", optionRow.product_id)
              .maybeSingle();

            if (!productErr && productRow?.image_url) {
              iconUrl = productRow.image_url;
            }
          }
        }
      } catch (_) {
        // 실패 시 기본 아이콘 유지
      }

      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          icon: iconUrl,
          tag: `receipt-${transaction.id}`,
          data: {
            type: "receipt",
            transactionId: transaction.id,
            receiptType: type,
          },
        }),
      });
    } catch (notificationError) {
      console.error("푸시 알림 전송 실패:", notificationError);
      // 푸시 알림 실패는 전체 프로세스를 중단시키지 않음
    }

    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    console.error("[UNHANDLED ERROR]", error);
    return NextResponse.json({ error: "입고/출고 처리 실패", detail: String(error) }, { status: 500 });
  }
}
