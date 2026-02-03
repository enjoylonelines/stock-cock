import { createClient } from "@/lib/supabase/server";

interface UpdateInventoryOptions {
  productOptionId: string;
  warehouseId: string;
  quantityChange?: number; // 완제품용 (개수)
  weightChange?: number; // 원재료용 (g 단위)
  isMaterial?: boolean; // 원재료 여부
}

/**
 * 재고 업데이트 헬퍼 함수
 * @param options 업데이트 옵션
 * @throws 에러 발생 시 throw
 */
export async function updateInventory(
  productOptionId: string,
  warehouseId: string,
  quantityChange: number
): Promise<void>;
export async function updateInventory(options: UpdateInventoryOptions): Promise<void>;

export async function updateInventory(
  optionsOrProductOptionId: UpdateInventoryOptions | string,
  warehouseId?: string,
  quantityChange?: number
): Promise<void> {
  // 옵션 객체 형식으로 변환
  const options: UpdateInventoryOptions =
    typeof optionsOrProductOptionId === "string"
      ? {
          productOptionId: optionsOrProductOptionId,
          warehouseId: warehouseId ?? "",
          quantityChange: quantityChange ?? 0,
          isMaterial: false,
        }
      : optionsOrProductOptionId;

  const supabase = await createClient();
  const { data: inventory, error: invError } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_option_id", options.productOptionId)
    .eq("warehouse_id", options.warehouseId)
    .maybeSingle();

  if (invError) {
    throw new Error(`재고 조회 실패: ${invError.message}`);
  }

  if (options.isMaterial) {
    // 원재료: weight_in_grams 사용
    const newWeight = (inventory?.weight_in_grams ?? 0) + (options.weightChange ?? 0);

    if (inventory) {
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ weight_in_grams: newWeight })
        .eq("id", inventory.id);

      if (updateError) {
        throw new Error(`재고 업데이트 실패: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase.from("inventory").insert([
        {
          product_option_id: options.productOptionId,
          warehouse_id: options.warehouseId,
          weight_in_grams: options.weightChange ?? 0,
          quantity: null,
        },
      ]);

      if (insertError) {
        throw new Error(`재고 생성 실패: ${insertError.message}`);
      }
    }
  } else {
    // 완제품: quantity 사용
    const newQty = (inventory?.quantity ?? 0) + (options.quantityChange ?? 0);

    if (inventory) {
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ quantity: newQty })
        .eq("id", inventory.id);

      if (updateError) {
        throw new Error(`재고 업데이트 실패: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase.from("inventory").insert([
        {
          product_option_id: options.productOptionId,
          warehouse_id: options.warehouseId,
          quantity: options.quantityChange ?? 0,
        },
      ]);

      if (insertError) {
        throw new Error(`재고 생성 실패: ${insertError.message}`);
      }
    }
  }
}

/**
 * 재고 직접 설정 (조정용)
 * @param options 설정 옵션
 */
export async function setInventory(options: {
  productOptionId: string;
  warehouseId: string;
  quantity?: number; // 완제품용
  weightInGrams?: number; // 원재료용
  isMaterial?: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const { data: inventory, error: invError } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_option_id", options.productOptionId)
    .eq("warehouse_id", options.warehouseId)
    .maybeSingle();

  if (invError) {
    throw new Error(`재고 조회 실패: ${invError.message}`);
  }

  const updateData = options.isMaterial
    ? { weight_in_grams: options.weightInGrams ?? 0, quantity: null }
    : { quantity: options.quantity ?? 0 };

  if (inventory) {
    const { error: updateError } = await supabase.from("inventory").update(updateData).eq("id", inventory.id);

    if (updateError) {
      throw new Error(`재고 업데이트 실패: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from("inventory").insert([
      {
        product_option_id: options.productOptionId,
        warehouse_id: options.warehouseId,
        ...updateData,
      },
    ]);

    if (insertError) {
      throw new Error(`재고 생성 실패: ${insertError.message}`);
    }
  }
}
