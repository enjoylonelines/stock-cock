import type { ProductOptionView } from "@/types/database";

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
  filterProducts(products: ProductOptionView[], filters: ProductFilters): ProductOptionView[] {
    return products.filter(product => {
      // 제품 타입 필터
      if (filters.productType && filters.productType !== "all") {
        if (product.product_type !== filters.productType) {
          return false;
        }
      }

      // 검색어 필터
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.trim().replace(/\s+/g, "").toLowerCase();
        const matchesName = product.product_name.replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesSku = product.sku.replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesBrand = product.brand_name.replace(/\s+/g, "").toLowerCase().includes(searchLower);
        const matchesCategory = product.category_name.replace(/\s+/g, "").toLowerCase().includes(searchLower);

        if (!matchesName && !matchesSku && !matchesBrand && !matchesCategory) {
          return false;
        }
      }

      // 카테고리 필터
      if (filters.categoryId && product.category_name !== filters.categoryId) {
        // categoryId는 실제로는 category name과 비교해야 할 수도 있음
        // 타입에 따라 조정 필요
        return false;
      }

      // 브랜드 필터
      if (filters.brandId && product.brand_name !== filters.brandId) {
        // brandId는 실제로는 brand name과 비교해야 할 수도 있음
        return false;
      }

      // 창고 필터
      if (filters.warehouseId && product.warehouse_id !== filters.warehouseId) {
        return false;
      }

      return true;
    });
  },
};
