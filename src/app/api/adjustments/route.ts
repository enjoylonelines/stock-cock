import { createClient } from "@/lib/supabase/server";
import type { AdjustmentInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { setInventory } from "@/utils/inventory";
import { apiLogger } from "@/utils/logger";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const endpoint = "/api/adjustments";
  const supabase = await createClient();

  try {
    const body: AdjustmentInput = await request.json();
    const { warehouse_id, memo, created_at, items, user_id } = body;

    apiLogger.requestStart(endpoint, body);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw APIError.badRequest("제품 항목이 필요합니다.");
    }

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
      apiLogger.dbError("트랜잭션 생성", txError);
      throw APIError.fromSupabaseError(txError);
    }

    for (const item of items) {
      apiLogger.transaction("조정 항목 처리 시작", item);

      // [2] inventory 조정 (목표 재고로 설정)
      const { data: currentInventory, error: currentInvError } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_option_id", item.option_id)
        .eq("warehouse_id", warehouse_id)
        .maybeSingle();

      if (currentInvError) {
        apiLogger.dbError("현재 재고 조회", currentInvError);
        throw APIError.fromSupabaseError(currentInvError);
      }

      const isMaterial = item.product_type === "material";
      const currentQuantity = isMaterial ? (currentInventory?.weight_in_grams ?? 0) : (currentInventory?.quantity ?? 0);
      const adjustmentQuantity = item.quantity - currentQuantity; // 목표 재고 - 현재 재고 = 조정량

      await setInventory({
        productOptionId: item.option_id,
        warehouseId: warehouse_id,
        quantity: isMaterial ? undefined : item.quantity,
        weightInGrams: isMaterial ? item.quantity : undefined,
        isMaterial,
      });

      // [3] transaction_items 기록 (조정량 기록)
      const { error: itemError } = await supabase.from("transaction_items").insert([
        {
          transaction_id: transaction.id,
          product_option_id: item.option_id,
          quantity: adjustmentQuantity, // 조정량 기록
        },
      ]);

      if (itemError) {
        apiLogger.dbError("트랜잭션 항목 생성", itemError);
        throw APIError.fromSupabaseError(itemError);
      }
    }

    // 푸시 알림 전송 (실패해도 전체 프로세스를 중단하지 않음)
    const allMaterial = items.every(item => item.product_type === "material");
    const totalWeightGrams = allMaterial ? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0) : undefined;

    await sendTransactionNotification({
      type: "adjust",
      transactionId: transaction.id,
      itemCount: items.length,
      totalWeightGrams,
      firstOptionId: items[0]?.option_id,
    });

    apiLogger.requestSuccess(endpoint, { transaction_id: transaction.id });
    return NextResponse.json({ success: true, transaction_id: transaction.id });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
