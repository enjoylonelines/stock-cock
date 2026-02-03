import type { APIResponse, ProductCreateInput } from "@/types/api";
import { clientLogger } from "@/utils/client-logger";

/**
 * 제품 서비스
 */
export const productService = {
  /**
   * 제품 생성
   */
  async create(data: ProductCreateInput): Promise<APIResponse<{ product: unknown }>> {
    try {
      const response = await fetch("/api/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "제품 등록 중 오류가 발생했습니다.");
      }

      return await response.json();
    } catch (error) {
      clientLogger.error("제품 생성 실패", error);
      throw error;
    }
  },
};
