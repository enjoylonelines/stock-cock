import { supabase } from "@/lib/supabase";

/**
 * 재고 업데이트 헬퍼 함수
 * @param productOptionId 제품 옵션 ID
 * @param warehouseId 창고 ID
 * @param quantityChange 수량 변경량 (음수면 감소, 양수면 증가)
 * @throws 에러 발생 시 throw
 */
export async function updateInventory(productOptionId: string, warehouseId: string, quantityChange: number): Promise<void> {
  const { data: inventory, error: invError } = await supabase
    .from("inventory")
    .select("*")
    .eq("product_option_id", productOptionId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (invError) {
    throw new Error(`재고 조회 실패: ${invError.message}`);
  }

  const newQty = (inventory?.quantity ?? 0) + quantityChange;

  if (inventory) {
    const { error: updateError } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", inventory.id);

    if (updateError) {
      throw new Error(`재고 업데이트 실패: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from("inventory").insert([
      {
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: quantityChange,
      },
    ]);

    if (insertError) {
      throw new Error(`재고 생성 실패: ${insertError.message}`);
    }
  }
}
