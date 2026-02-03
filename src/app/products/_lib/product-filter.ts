import type { DomainInventoryItem } from "@/types/domain";

export type ProductType = "all" | "company" | "franchise" | "pb" | "material";

export interface ProductFilters {
  searchQuery?: string;
  productType?: ProductType;
  categoryId?: string;
  brandId?: string;
  warehouseId?: string;
}

/**
 * 제품 필터링 로직 (Products 전용)
 */
export const productFilter = {
  /**
   * 제품 목록 필터링
   */
  filterProducts(products: DomainInventoryItem[], filters: ProductFilters): DomainInventoryItem[] {
    return products.filter(product => {
      // 제품 타입 필터
      if (filters.productType && filters.productType !== "all") {
        if (product.productType !== filters.productType) {
          return false;
        }
      }

      // 검색어 필터
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.trim().replace(/\s+/g, "").toLowerCase();
        const matchesName = product.name.replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesSku = (product.sku ?? "").replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesBrand = product.brandName.replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesCategory = product.categoryName.replace(/\s+/g, "").toLowerCase().includes(searchLower);

        if (!matchesName && !matchesSku && !matchesBrand && !matchesCategory) {
          return false;
        }
      }

      // 카테고리 필터
      if (filters.categoryId && product.categoryName !== filters.categoryId) {
        return false;
      }

      // 브랜드 필터
      if (filters.brandId && product.brandName !== filters.brandId) {
        return false;
      }

      // 창고 필터
      if (filters.warehouseId && product.warehouseId !== filters.warehouseId) {
        return false;
      }

      return true;
    });
  },
};
