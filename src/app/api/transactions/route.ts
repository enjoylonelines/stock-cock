import type { TransactionInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const endpoint = "/api/transactions";
  const supabase = await createClient();

  try {
    const body: TransactionInput = await request.json();
    const { type, warehouse_id, supplier_id, memo, created_at, items, user_id } = body;

    apiLogger.requestStart(endpoint, body);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw APIError.badRequest("제품 항목이 필요합니다.");
    }

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
      apiLogger.dbError("트랜잭션 생성", txError);
      throw APIError.fromSupabaseError(txError);
    }

    for (const item of items) {
      apiLogger.transaction("항목 처리 시작", item);

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
        apiLogger.dbError("배치 생성", batchError);
        throw APIError.fromSupabaseError(batchError);
      }

      // [3] inventory upsert
      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_option_id", item.option_id)
        .eq("warehouse_id", warehouse_id)
        .maybeSingle();

      if (invError) {
        apiLogger.dbError("재고 조회", invError);
        throw APIError.fromSupabaseError(invError);
      }

      const isMaterial = item.product_type === "material";
      let signedQty = item.quantity;
      if (type === "out") signedQty = -item.quantity;

      if (isMaterial) {
        // 원재료: weight_in_grams 사용
        const newWeight = (inventory?.weight_in_grams ?? 0) + signedQty;

        if (inventory) {
          const { error: updateError } = await supabase
            .from("inventory")
            .update({ weight_in_grams: newWeight })
            .eq("id", inventory.id);

          if (updateError) {
            apiLogger.dbError("재고 업데이트", updateError);
            throw APIError.fromSupabaseError(updateError);
          }
        } else {
          const { error: insertError } = await supabase.from("inventory").insert([
            {
              product_option_id: item.option_id,
              warehouse_id,
              weight_in_grams: signedQty,
              quantity: null,
            },
          ]);

          if (insertError) {
            apiLogger.dbError("재고 생성", insertError);
            throw APIError.fromSupabaseError(insertError);
          }
        }
      } else {
        // 완제품: quantity 사용
        const newQty = (inventory?.quantity ?? 0) + signedQty;

        if (inventory) {
          const { error: updateError } = await supabase
            .from("inventory")
            .update({ quantity: newQty })
            .eq("id", inventory.id);

          if (updateError) {
            apiLogger.dbError("재고 업데이트", updateError);
            throw APIError.fromSupabaseError(updateError);
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
            apiLogger.dbError("재고 생성", insertError);
            throw APIError.fromSupabaseError(insertError);
          }
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
        apiLogger.dbError("트랜잭션 항목 생성", itemError);
        throw APIError.fromSupabaseError(itemError);
      }
    }

    // 푸시 알림 전송 (실패해도 전체 프로세스를 중단하지 않음)
    await sendTransactionNotification({
      type,
      transactionId: transaction.id,
      itemCount: items.length,
      firstOptionId: items[0]?.option_id,
    });

    apiLogger.requestSuccess(endpoint, { transaction_id: transaction.id });
    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
