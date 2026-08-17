import { createClient } from "@/lib/supabase/server";
import type { MoveInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
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

    const { data, error } = await supabase.rpc("create_move_transaction", {
      p_header: { from_warehouse_id, to_warehouse_id, memo, created_at, user_id } as unknown as Record<
        string,
        unknown
      >,
      p_items: items.map(item => ({
        option_id: item.option_id,
        quantity: item.quantity,
        product_type: item.product_type,
      })) as unknown as Record<string, unknown>[],
    });

    if (error) {
      apiLogger.dbError("이동 트랜잭션 생성", error);
      throw APIError.fromSupabaseError(error);
    }

    const transactionId = (data as { transaction_id: string }).transaction_id;

    // 푸시 알림 전송 (실패해도 전체 프로세스를 중단하지 않음)
    const allMaterial = items.every(item => item.product_type === "material");
    const totalWeightGrams = allMaterial ? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0) : undefined;

    await sendTransactionNotification({
      type: "move",
      transactionId,
      itemCount: items.length,
      totalWeightGrams,
      firstOptionId: items[0]?.option_id,
    });

    apiLogger.requestSuccess(endpoint, { transaction_id: transactionId });
    return NextResponse.json({ success: true, transaction_id: transactionId });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
