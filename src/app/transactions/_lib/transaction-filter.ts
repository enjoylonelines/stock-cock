import type { GroupedTransactions } from "@/hooks/useTransactionHistory";
import { endOfDay, startOfDay } from "date-fns";

export interface TransactionFilters {
  transactionType?: string;
  product?: string;
  location?: string;
  supplier?: string;
  member?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface FilterContext {
  selectedLocationName: string | null;
  selectedSupplierName: string | null;
  selectedProductName: string | null;
  selectedMemberName: string | null;
  start: Date | null;
  end: Date | null;
}

/**
 * 입출고 이력 필터링 로직 (Transaction 전용)
 */
export const transactionFilter = {
  /**
   * 필터 컨텍스트 생성
   */
  createFilterContext(filters: TransactionFilters): FilterContext {
    const start = filters.startDate ? startOfDay(filters.startDate) : null;
    const end = filters.endDate ? endOfDay(filters.endDate) : null;

    return {
      selectedLocationName: null, // 실제 이름은 외부에서 주입
      selectedSupplierName: null,
      selectedProductName: null,
      selectedMemberName: null,
      start,
      end,
    };
  },

  /**
   * 그룹화된 거래 목록 필터링
   */
  filterGroupedTransactions(
    grouped: GroupedTransactions[],
    filters: TransactionFilters,
    context: FilterContext
  ): GroupedTransactions[] {
    // 기본: 전체 보기 (필터 없음)
    const hasAnyFilter =
      (filters.transactionType && filters.transactionType !== "전체") ||
      !!filters.product ||
      !!filters.location ||
      !!filters.supplier ||
      !!filters.member ||
      !!context.start ||
      !!context.end;

    if (!hasAnyFilter) return grouped;

    return grouped
      .map(group => {
        const transactions = group.transactions.filter(tx => {
          // 거래 종류
          if (filters.transactionType && filters.transactionType !== "전체" && tx.type_kr !== filters.transactionType) {
            return false;
          }

          // 날짜 범위
          if (!tx.created_at) return false;
          const createdAt = new Date(tx.created_at);
          if (context.start && createdAt < context.start) return false;
          if (context.end && createdAt > context.end) return false;

          // 위치 (이름 매칭)
          if (context.selectedLocationName) {
            const matchLocation =
              tx.from_warehouse_name === context.selectedLocationName ||
              tx.to_warehouse_name === context.selectedLocationName;
            if (!matchLocation) return false;
          }

          // 제품 (이름 매칭)
          if (context.selectedProductName && tx.product_name !== context.selectedProductName) return false;

          // 거래처 (이름 매칭)
          if (context.selectedSupplierName && tx.supplier_name !== context.selectedSupplierName) return false;

          // 멤버 (이름 매칭)
          if (context.selectedMemberName && tx.user_name !== context.selectedMemberName) return false;

          return true;
        });

        return { ...group, transactions };
      })
      .filter(g => g.transactions.length > 0);
  },
};
