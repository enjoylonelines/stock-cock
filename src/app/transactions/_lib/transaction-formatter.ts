import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { TransactionInput, MoveInput, AdjustmentInput } from "@/types/api";
import type { ProductOptionView } from "@/types/database";

/**
 * 거래 데이터 포맷팅 로직 (Transactions 전용)
 */
export const transactionFormatter = {
  /**
   * 날짜를 한국어 형식으로 포맷팅
   */
  formatDate(date: Date): string {
    return format(date, "yyyy년 MM월 dd일", { locale: ko });
  },

  /**
   * 날짜를 API 형식으로 포맷팅
   */
  formatDateForAPI(date: Date): string {
    return format(date, "yyyy-MM-dd HH:mm:ss");
  },

  /**
   * 입출고 거래 데이터를 API 형식으로 변환
   */
  formatTransactionData(data: {
    type: "in" | "out";
    warehouse_id: string;
    supplier_id: string;
    memo: string;
    selectedDate: Date;
    selectedProducts: ProductOptionView[];
    user_id: string;
  }): TransactionInput {
    return {
      type: data.type,
      warehouse_id: data.warehouse_id,
      supplier_id: data.supplier_id,
      memo: data.memo,
      created_at: this.formatDateForAPI(data.selectedDate),
      items: data.selectedProducts.map(product => ({
        option_id: product.product_option_id,
        quantity: product.quantity || 1,
        unit_price: 0, // API에서 null 대신 0 사용
        product_type: product.product_type, // 원재료 구분용
      })),
      user_id: data.user_id,
    };
  },

  /**
   * 재고 이동 데이터를 API 형식으로 변환
   */
  formatMoveData(data: {
    from_warehouse_id: string;
    to_warehouse_id: string;
    memo: string;
    selectedDate: Date;
    selectedProducts: ProductOptionView[];
    user_id: string;
  }): MoveInput {
    return {
      from_warehouse_id: data.from_warehouse_id,
      to_warehouse_id: data.to_warehouse_id,
      memo: data.memo,
      created_at: this.formatDateForAPI(data.selectedDate),
      items: data.selectedProducts.map(product => ({
        option_id: product.product_option_id,
        quantity: product.quantity || 1,
        unit_price: 0, // API에서 null 대신 0 사용
        product_type: product.product_type, // 원재료 구분용
      })),
      user_id: data.user_id,
    };
  },

  /**
   * 재고 조정 데이터를 API 형식으로 변환
   */
  formatAdjustmentData(data: {
    warehouse_id: string;
    memo: string;
    selectedDate: Date;
    selectedProducts: ProductOptionView[];
    user_id: string;
  }): AdjustmentInput {
    return {
      warehouse_id: data.warehouse_id,
      memo: data.memo,
      created_at: this.formatDateForAPI(data.selectedDate),
      items: data.selectedProducts.map(product => ({
        option_id: product.product_option_id,
        quantity: product.quantity ?? 0,
        unit_price: 0, // API에서 null 대신 0 사용
        product_type: product.product_type, // 원재료 구분용
      })),
      user_id: data.user_id,
    };
  },
};
