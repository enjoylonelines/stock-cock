import { createClient } from "@/lib/supabase/server";
import type { TransactionInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const endpoint = "/api/transactions";
  try {
    let body: TransactionInput;
    try {
      body = await request.json();
    } catch {
      throw APIError.badRequest("올바른 JSON 요청이 필요합니다.");
    }
    if (!body || typeof body !== "object") {
      throw APIError.badRequest("입출고 요청이 필요합니다.");
    }
    const { type, warehouse_id, supplier_id, memo, created_at, items, user_id } = body;

    apiLogger.requestStart(endpoint, body);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw APIError.badRequest("제품 항목이 필요합니다.");
    }

    if (typeof type !== "string" || !["in", "out"].includes(type.toLowerCase())) {
      throw APIError.badRequest("입고 또는 출고 유형이 필요합니다.");
    }
    if (
      items.some(
        item =>
          !item ||
          typeof item.quantity !== "number" ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          (item.product_type === "material" && !Number.isInteger(item.quantity))
      )
    ) {
      throw APIError.badRequest("수량은 양수여야 하며 원재료 중량은 정수 g 단위여야 합니다.");
    }

    const supabase = await createClient();
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
      ...(item.product_type !== undefined && { product_type: item.product_type }),
    }));

    const { data, error } = await supabase.rpc("create_transaction", {
      p_header: p_header as unknown as Record<string, unknown>,
      p_items: p_items as unknown as Record<string, unknown>[],
    });

    if (error) {
      apiLogger.dbError("create_transaction RPC", error);
      // SQLSTATE alone is not a business contract: unrelated RAISE errors stay technical failures.
      if (error.code === "P0001" && error.message === "INSUFFICIENT_STOCK") {
        throw new APIError(409, "출고 가능한 재고가 부족합니다.", "INSUFFICIENT_STOCK");
      }
      if (error.code === "P0002" && error.message === "INVENTORY_NOT_FOUND") {
        throw new APIError(409, "출고할 재고가 없습니다.", "INVENTORY_NOT_FOUND");
      }
      if (error.code === "22023") {
        throw new APIError(400, "입출고 입력값을 확인해 주세요.", "INVALID_TRANSACTION_INPUT");
      }
      throw APIError.fromSupabaseError(error);
    }

    const transactionId = data?.transaction_id;
    if (!transactionId) {
      throw APIError.internalServer("트랜잭션 생성 결과가 없습니다.");
    }

    const allMaterial = items.every(item => item.product_type === "material");
    const totalWeightGrams = allMaterial ? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0) : undefined;

    await sendTransactionNotification({
      type,
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
