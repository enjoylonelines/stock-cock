import { createClient } from "@/lib/supabase/server";
import type { MoveInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { updateInventory } from "@/utils/inventory";
import { apiLogger } from "@/utils/logger";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const endpoint = "/api/moves";
  const supabase = await createClient();

  try {
    const body: MoveInput = await request.json();
    const { from_warehouse_id, to_warehouse_id, memo, created_at, items, user_id } = body;

    apiLogger.requestStart(endpoint, body);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw APIError.badRequest("제품 항목이 필요합니다.");
    }
    if (from_warehouse_id === to_warehouse_id) {
      throw APIError.badRequest("출발지와 도착지는 같을 수 없습니다.");
    }

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
      apiLogger.dbError("트랜잭션 생성", txError);
      throw APIError.fromSupabaseError(txError);
    }

    for (const item of items) {
      apiLogger.transaction("이동 항목 처리 시작", item);

      const isMaterial = item.product_type === "material";

      // 출발지 재고 차감
      await updateInventory({
        productOptionId: item.option_id,
        warehouseId: from_warehouse_id,
        quantityChange: isMaterial ? undefined : -item.quantity,
        weightChange: isMaterial ? -item.quantity : undefined,
        isMaterial,
      });

      // 도착지 재고 추가
      await updateInventory({
        productOptionId: item.option_id,
        warehouseId: to_warehouse_id,
        quantityChange: isMaterial ? undefined : item.quantity,
        weightChange: isMaterial ? item.quantity : undefined,
        isMaterial,
      });

      // [2] transaction_items 기록 (배치 없이)
      const { error: itemError } = await supabase.from("transaction_items").insert([
        {
          transaction_id: transaction.id,
          product_option_id: item.option_id,
          batch_id: null, // 이동은 배치 없음
          quantity: item.quantity,
        },
      ]);

      if (itemError) {
        apiLogger.dbError("트랜잭션 항목 생성", itemError);
        throw APIError.fromSupabaseError(itemError);
      }
    }

    // 푸시 알림 전송 (실패해도 전체 프로세스를 중단하지 않음)
    await sendTransactionNotification({
      type: "move",
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
