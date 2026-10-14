import type { APIResponse } from "@/types/api";
import { clientLogger } from "@/utils/client-logger";

export type InventoryDocumentInput = {
  document_type: "in" | "out";
  warehouse_id: string;
  supplier_id?: string | null;
  sales_amount?: number;
  memo?: string;
  effective_at?: string;
  idempotency_key: string;
  items: Array<{ option_id: string; quantity: number }>;
};

export const inventoryDocumentService = {
  async submit(
    data: InventoryDocumentInput
  ): Promise<APIResponse<{ document_id: string; status: "PENDING_APPROVAL" }>> {
    try {
      const response = await fetch("/api/inventory-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
        const message = errorData.error || "승인 요청 처리 중 오류가 발생했습니다.";
        throw new Error(errorData.detail ? `${message}\n\n상세: ${errorData.detail}` : message);
      }
      return await response.json();
    } catch (error) {
      clientLogger.error("승인 전표 생성 실패", error);
      throw error;
    }
  },
};
