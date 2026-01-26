import type { ProductOptionView } from "@/types/database";
import type { Inventory } from "@/types/database";

/**
 * 재고 계산 로직 (공용 - 여러 feature에서 사용)
 */
export const stockCalculator = {
  /**
   * 특정 위치의 제품 재고 계산
   */
  getCurrentStock(
    productOptionId: string,
    inventories: Inventory[],
    warehouseId?: string
  ): number {
    if (warehouseId) {
      // 특정 위치의 재고
      return inventories.find(
        inv => inv.product_option_id === productOptionId && inv.warehouse_id === warehouseId
      )?.quantity ?? 0;
    }
    // 전체 재고 합계
    return inventories
      .filter(inv => inv.product_option_id === productOptionId)
      .reduce((sum, inv) => sum + inv.quantity, 0);
  },

  /**
   * 출발지에 재고가 있는 제품만 필터링
   */
  getAvailableProducts(
    products: ProductOptionView[],
    inventories: Inventory[],
    fromWarehouseId: string
  ): ProductOptionView[] {
    return products.filter(product => {
      const inventory = inventories.find(
        inv => inv.product_option_id === product.product_option_id && inv.warehouse_id === fromWarehouseId
      );
      return inventory && inventory.quantity > 0;
    });
  },
};
