import { createClient } from "@/lib/supabase/server";
import type { TransactionInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
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

    const p_header = {
      type: type.toLowerCase(),
      user_id,
      warehouse_id,
      supplier_id: supplier_id ?? null,
      memo: memo ?? "",
      created_at: created_at ?? new Date().toISOString(),
    };

    const p_items = items.map(item => ({
      option_id: item.option_id,
      quantity: item.quantity,
      product_type: item.product_type ?? "company",
    }));

    const { data, error } = await supabase.rpc("create_transaction", {
      p_header: p_header as unknown as Record<string, unknown>,
      p_items: p_items as unknown as Record<string, unknown>[],
    });

    if (error) {
      apiLogger.dbError("create_transaction RPC", error);
      throw APIError.fromSupabaseError(error);
    }

    const transactionId = data?.transaction_id;
    if (!transactionId) {
      throw APIError.badRequest("트랜잭션 생성 결과가 없습니다.");
    }

    await sendTransactionNotification({
      type,
      transactionId,
      itemCount: items.length,
      firstOptionId: items[0]?.option_id,
    });

    apiLogger.requestSuccess(endpoint, { transaction_id: transactionId });
    return NextResponse.json({ success: true, transaction_id: transactionId });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
