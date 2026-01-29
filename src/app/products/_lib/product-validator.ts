/**
 * 제품 폼 검증 로직 (Products 전용)
 */
export const productValidator = {
  /**
   * 제품 기본 정보 검증
   */
  validateProduct(data: {
    name: string;
    categoryId: string;
    brandId: string;
    productType?: string;
  }): { isValid: boolean; error?: string } {
    if (!data.name || data.name.trim().length === 0) {
      return {
        isValid: false,
        error: "제품 이름을 입력해주세요.",
      };
    }

    if (!data.categoryId) {
      return {
        isValid: false,
        error: "카테고리를 선택해주세요.",
      };
    }

    if (!data.brandId) {
      return {
        isValid: false,
        error: "브랜드를 선택해주세요.",
      };
    }

    return { isValid: true };
  },

  /**
   * 제품 옵션 검증
   */
  validateProductOption(data: {
    weight: number;
    weightUnit: string;
    sku?: string;
  }): { isValid: boolean; error?: string } {
    if (!data.weight || data.weight <= 0) {
      return {
        isValid: false,
        error: "중량을 입력해주세요.",
      };
    }

    if (!data.weightUnit) {
      return {
        isValid: false,
        error: "중량 단위를 선택해주세요.",
      };
    }

    return { isValid: true };
  },
};
