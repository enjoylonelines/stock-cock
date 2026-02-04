import { isMaterialItem } from "@/lib/domain/stock";
import type { Inventory } from "@/types/database";
import type { DomainStockItem } from "@/types/domain";

/**
 * 인벤토리에서 유효한 재고 값 반환
 * 완제품: quantity, 원재료: weight_in_grams
 */
const getInventoryValue = (inv: Inventory): number => {
  // quantity가 있으면 완제품, 없으면 원재료 (weight_in_grams 사용)
  if (inv.quantity !== null && inv.quantity !== undefined) {
    return inv.quantity;
  }
  return inv.weight_in_grams ?? 0;
};

/**
 * 재고 계산 로직 (공용 - 여러 feature에서 사용)
 */
export const stockCalculator = {
  /**
   * 특정 위치의 제품 재고 계산
   * 완제품: 개수 반환, 원재료: g 단위 중량 반환
   */
  getCurrentStock(productOptionId: string, inventories: Inventory[], warehouseId?: string): number {
    if (warehouseId) {
      // 특정 위치의 재고
      const inv = inventories.find(
        inv => inv.product_option_id === productOptionId && inv.warehouse_id === warehouseId
      );
      return inv ? getInventoryValue(inv) : 0;
    }
    // 전체 재고 합계
    return inventories
      .filter(inv => inv.product_option_id === productOptionId)
      .reduce((sum, inv) => sum + getInventoryValue(inv), 0);
  },

  /**
   * 원재료 여부에 따른 재고 값 반환
   * @param isMaterial 원재료 여부
   */
  getCurrentStockByType(
    productOptionId: string,
    inventories: Inventory[],
    warehouseId?: string,
    isMaterial?: boolean
  ): number {
    const inv = warehouseId
      ? inventories.find(i => i.product_option_id === productOptionId && i.warehouse_id === warehouseId)
      : inventories.find(i => i.product_option_id === productOptionId);

    if (!inv) return 0;

    if (isMaterial) {
      return inv.weight_in_grams ?? 0;
    }
    return inv.quantity ?? 0;
  },

  /**
   * 출발지에 재고가 있는 제품만 필터링
   */
  getAvailableProducts(
    products: DomainStockItem[],
    inventories: Inventory[],
    fromWarehouseId: string
  ): DomainStockItem[] {
    return products.filter(product => {
      const inventory = inventories.find(
        inv => inv.product_option_id === product.productOptionId && inv.warehouse_id === fromWarehouseId
      );
      if (!inventory) return false;

      // 원재료는 weight_in_grams, 완제품은 quantity 확인
      if (isMaterialItem(product)) {
        return (inventory.weight_in_grams ?? 0) > 0;
      }
      return (inventory.quantity ?? 0) > 0;
    });
  },
};
