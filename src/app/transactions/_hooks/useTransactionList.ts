import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useTransactionFilterDrawerStore } from "@/store/TransactionFilterDrawer";
import { useMemo } from "react";
import { transactionFilter } from "../_lib/transaction-filter";
import { useProfiles } from "./useProfiles";

/**
 * 입출고 목록 비즈니스 로직 훅
 */
export function useTransactionList() {
  const { grouped, loading } = useTransactionHistory();

  const { filters } = useTransactionFilterDrawerStore();
  const { warehouses } = useWarehouses();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { profiles } = useProfiles();

  // 필터 컨텍스트 생성
  const filterContext = useMemo(() => {
    const context = transactionFilter.createFilterContext(filters);

    // 이름 매핑
    context.selectedLocationName = filters.location
      ? (warehouses.find(l => l.id === filters.location)?.name ?? null)
      : null;

    context.selectedSupplierName = filters.supplier
      ? (suppliers.find(s => s.id === filters.supplier)?.name ?? null)
      : null;

    context.selectedProductName = filters.product
      ? (products.find(p => p.productOptionId === filters.product)?.name ?? null)
      : null;

    context.selectedMemberName = filters.member ? (profiles.find(p => p.id === filters.member)?.name ?? null) : null;

    return context;
  }, [filters, warehouses, suppliers, products, profiles]);

  // 필터링된 그룹
  const filteredGrouped = useMemo(() => {
    return transactionFilter.filterGroupedTransactions(grouped, filters, filterContext);
  }, [grouped, filters, filterContext]);

  return {
    loading,
    filteredGrouped,
  };
}
