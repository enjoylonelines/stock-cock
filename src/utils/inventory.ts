import { createClient } from "@/lib/supabase/server";
import { APIError } from "@/utils/api-error";

interface MoveInventoryItem {
  optionId: string;
  quantity: number;
  productType?: string;
}

interface LedgeredMoveInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  userId: string;
  memo?: string;
  createdAt?: string;
  items: MoveInventoryItem[];
}

interface AbsoluteInventoryAdjustment {
  productOptionId: string;
  warehouseId: string;
  quantity?: number;
  weightInGrams?: number;
  isMaterial?: boolean;
  expectedVersion: number;
  reason: string;
  actorId?: string;
}

/**
 * Operational moves must be one database transaction: canonical move ledger,
 * transaction items, source decrement, and destination increment.
 */
export async function moveInventory(input: LedgeredMoveInput): Promise<string> {
  if (input.fromWarehouseId === input.toWarehouseId || input.items.length === 0) {
    throw APIError.badRequest("유효한 재고 이동 항목과 서로 다른 창고가 필요합니다.");
  }
  if (input.items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
    throw APIError.badRequest("이동 수량은 양수여야 합니다.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_inventory_move", {
    p_header: {
      from_warehouse_id: input.fromWarehouseId,
      to_warehouse_id: input.toWarehouseId,
      user_id: input.userId,
      memo: input.memo ?? "",
      created_at: input.createdAt ?? new Date().toISOString(),
    },
    p_items: input.items.map(item => ({
      option_id: item.optionId,
      quantity: item.quantity,
      ...(item.productType !== undefined && { product_type: item.productType }),
    })),
  });

  if (error) {
    if (error.code === "P0001" && error.message === "INSUFFICIENT_STOCK") {
      throw new APIError(409, "이동 가능한 재고가 부족합니다.", "INSUFFICIENT_STOCK");
    }
    if (error.code === "P0002" && error.message === "INVENTORY_NOT_FOUND") {
      throw new APIError(409, "이동할 재고가 없습니다.", "INVENTORY_NOT_FOUND");
    }
    if (error.code === "22023") {
      throw APIError.badRequest("재고 이동 입력값을 확인해 주세요.");
    }
    throw APIError.fromSupabaseError(error);
  }
  if (!data?.transaction_id) {
    throw APIError.internalServer("재고 이동 결과가 없습니다.");
  }
  return data.transaction_id;
}

/**
 * Intentional absolute correction only. Callers must supply an auditable reason
 * and the version they observed; stale versions are rejected by the database.
 */
export async function setInventory(options: AbsoluteInventoryAdjustment): Promise<void> {
  const target = options.isMaterial ? options.weightInGrams : options.quantity;
  if (typeof target !== "number" || !Number.isFinite(target)) {
    throw new Error("유효한 조정 목표값이 필요합니다.");
  }
  if (!Number.isSafeInteger(options.expectedVersion) || options.expectedVersion < 0) {
    throw new Error("유효한 재고 버전이 필요합니다.");
  }
  if (!options.reason.trim()) {
    throw new Error("재고 조정 사유가 필요합니다.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_inventory_adjustment", {
    p_product_option_id: options.productOptionId,
    p_warehouse_id: options.warehouseId,
    p_quantity: options.isMaterial ? null : options.quantity,
    p_weight: options.isMaterial ? options.weightInGrams : null,
    p_expected_version: options.expectedVersion,
    p_reason: options.reason,
    p_actor_id: options.actorId ?? null,
  });

  if (error) {
    if (error.code === "P0001" && error.message === "INVENTORY_ADJUSTMENT_CONFLICT") {
      throw new APIError(409, "재고 조정 대상이 변경되었습니다. 다시 확인해 주세요.", "INVENTORY_ADJUSTMENT_CONFLICT");
    }
    if (error.code === "22023") {
      throw APIError.badRequest("재고 조정 입력값을 확인해 주세요.");
    }
    throw APIError.fromSupabaseError(error);
  }
}
