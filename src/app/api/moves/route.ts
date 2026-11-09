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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw APIError.unauthorized();
    const body: MoveInput = await request.json();
    const { items, ...header } = body;
    if (!Array.isArray(items) || !items.length) throw APIError.badRequest("제품 항목이 필요합니다.");
    const { data, error } = await supabase.rpc("post_inventory_transaction", {
      p_header: { ...header, type: "move" },
      p_items: items,
    });
    if (error) throw APIError.fromSupabaseError(error);
    try {
      await sendTransactionNotification({
        type: "move",
        transactionId: data.transaction_id,
        itemCount: items.length,
        firstOptionId: items[0]?.option_id,
      });
    } catch (notificationError) {
      apiLogger.requestError(endpoint, notificationError, { context: "알림 전송 실패, 거래는 저장됨" });
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
