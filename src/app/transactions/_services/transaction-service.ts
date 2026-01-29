import type { TransactionInput, MoveInput, AdjustmentInput, APIResponse } from "@/types/api";
import { clientLogger } from "@/utils/client-logger";

/**
 * 거래(입출고) 서비스
 */
export const transactionService = {
  /**
   * 입출고 거래 생성
   */
  async create(data: TransactionInput): Promise<APIResponse<{ transaction_id: string }>> {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "거래 처리 중 오류가 발생했습니다.");
      }

      return await response.json();
    } catch (error) {
      clientLogger.error("거래 생성 실패", error);
      throw error;
    }
  },
};

/**
 * 재고 이동 서비스
 */
export const moveService = {
  /**
   * 재고 이동 생성
   */
  async create(data: MoveInput): Promise<APIResponse<{ transaction_id: string }>> {
    try {
      const response = await fetch("/api/moves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "재고 이동 처리 중 오류가 발생했습니다.");
      }

      return await response.json();
    } catch (error) {
      clientLogger.error("재고 이동 실패", error);
      throw error;
    }
  },
};

/**
 * 재고 조정 서비스
 */
export const adjustmentService = {
  /**
   * 재고 조정 생성
   */
  async create(data: AdjustmentInput): Promise<APIResponse<{ transaction_id: string }>> {
    try {
      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "재고 조정 처리 중 오류가 발생했습니다.");
      }

      return await response.json();
    } catch (error) {
      clientLogger.error("재고 조정 실패", error);
      throw error;
    }
  },
};
