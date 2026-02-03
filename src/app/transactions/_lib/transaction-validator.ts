import type { DomainInventoryItem } from "@/types/domain";

/**
 * 거래 폼 검증 로직 (Transactions 전용)
 */
export const transactionValidator = {
  /**
   * 입출고 거래 폼 검증
   */
  validateTransactionForm(data: {
    selectedLocation: string | null;
    selectedSupplier: string | null;
    selectedProducts: DomainInventoryItem[];
    mode: "in" | "out";
  }): { isValid: boolean; error?: string } {
    if (!data.selectedLocation) {
      return {
        isValid: false,
        error: `${data.mode === "in" ? "입고처" : "출고처"}를 선택해주세요.`,
      };
    }

    if (!data.selectedSupplier) {
      return {
        isValid: false,
        error: "거래처를 선택해주세요.",
      };
    }

    if (data.selectedProducts.length === 0) {
      return {
        isValid: false,
        error: "제품을 선택해주세요.",
      };
    }

    return { isValid: true };
  },

  /**
   * 재고 이동 폼 검증
   */
  validateMoveForm(data: {
    fromLocation: string | null;
    toLocation: string | null;
    selectedProducts: DomainInventoryItem[];
  }): { isValid: boolean; error?: string } {
    if (!data.fromLocation || !data.toLocation) {
      return {
        isValid: false,
        error: "출발지와 도착지를 모두 선택해주세요.",
      };
    }

    if (data.fromLocation === data.toLocation) {
      return {
        isValid: false,
        error: "출발지와 도착지는 다르게 선택해주세요.",
      };
    }

    if (data.selectedProducts.length === 0) {
      return {
        isValid: false,
        error: "제품을 선택해주세요.",
      };
    }

    return { isValid: true };
  },

  /**
   * 재고 조정 폼 검증
   */
  validateAdjustmentForm(data: {
    selectedLocation: string | null;
    selectedProducts: DomainInventoryItem[];
  }): { isValid: boolean; error?: string } {
    if (!data.selectedLocation) {
      return {
        isValid: false,
        error: "위치를 선택해주세요.",
      };
    }

    if (data.selectedProducts.length === 0) {
      return {
        isValid: false,
        error: "제품을 선택해주세요.",
      };
    }

    return { isValid: true };
  },
};
