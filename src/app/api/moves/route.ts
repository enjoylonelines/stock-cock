import { InventoryMoveApplicationService, type InventoryMoveCommand } from "@/lib/inventory/move-application-service";
import type { MoveInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { moveInventory } from "@/utils/inventory";
import { apiLogger } from "@/utils/logger";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { NextResponse } from "next/server";

const moveApplicationService = new InventoryMoveApplicationService({
  createLedgeredMove: moveInventory,
});

export async function POST(request: Request) {
  const endpoint = "/api/moves";

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

    const command: InventoryMoveCommand = {
      fromWarehouseId: from_warehouse_id,
      toWarehouseId: to_warehouse_id,
      userId: user_id,
      memo,
      createdAt: created_at,
      items: items.map(item => ({
        optionId: item.option_id,
        quantity: item.quantity,
        productType: item.product_type,
      })),
    };
    const transactionId = await moveApplicationService.execute(command);

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
