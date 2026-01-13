"use client";
import type { GroupedTransactions } from "@/hooks/useInventoryHistory";
import { useProducts } from "@/hooks/useProducts";
import { useProfiles } from "@/hooks/useProfiles";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useLocations } from "@/hooks/useWarehouses";
import { useInventoryFilterDrawerStore } from "@/store/InventoryFilterDrawer";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { formatWeightDisplay } from "@/lib/utils";
import { endOfDay, startOfDay } from "date-fns";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpDown, ArrowUpToLine } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function InventoryList({ grouped }: { grouped: GroupedTransactions[] }) {
  const router = useRouter();
  const { filters } = useInventoryFilterDrawerStore();
  const { locations } = useLocations();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { profiles } = useProfiles();

  const selectedLocationName = useMemo(() => {
    if (!filters.location) return null;
    const loc = locations.find((l) => l.id === filters.location);
    return loc?.name ?? null;
  }, [filters.location, locations]);

  const selectedSupplierName = useMemo(() => {
    if (!filters.supplier) return null;
    const sup = suppliers.find((s) => s.id === filters.supplier);
    return sup?.name ?? null;
  }, [filters.supplier, suppliers]);

  const selectedProductName = useMemo(() => {
    if (!filters.product) return null;
    const prod = products.find((p) => p.product_option_id === filters.product);
    return prod?.product_name ?? null;
  }, [filters.product, products]);

  const selectedMemberName = useMemo(() => {
    if (!filters.member) return null;
    const member = profiles.find((p) => p.id === filters.member);
    return member?.name ?? null;
  }, [filters.member, profiles]);

  const start = useMemo(() => (filters.startDate ? startOfDay(filters.startDate) : null), [filters.startDate]);
  const end = useMemo(() => (filters.endDate ? endOfDay(filters.endDate) : null), [filters.endDate]);

  const filteredGrouped = useMemo(() => {
    // 기본: 전체 보기 (필터 없음)
    const hasAnyFilter =
      (filters.transactionType && filters.transactionType !== "전체") ||
      !!filters.product ||
      !!filters.location ||
      !!filters.supplier ||
      !!filters.member ||
      !!start ||
      !!end;

    if (!hasAnyFilter) return grouped;

    return grouped
      .map((group) => {
        const transactions = group.transactions.filter((tx) => {
          // 거래 종류
          if (filters.transactionType && filters.transactionType !== "전체" && tx.type_kr !== filters.transactionType) {
            return false;
          }

          // 날짜 범위
          const createdAt = new Date(tx.created_at);
          if (start && createdAt < start) return false;
          if (end && createdAt > end) return false;

          // 위치 (이름 매칭)
          if (selectedLocationName) {
            const matchLocation = tx.from_warehouse_name === selectedLocationName || tx.to_warehouse_name === selectedLocationName;
            if (!matchLocation) return false;
          }

          // 제품 (이름 매칭)
          if (selectedProductName && tx.product_name !== selectedProductName) return false;

          // 거래처 (이름 매칭)
          if (selectedSupplierName && tx.supplier_name !== selectedSupplierName) return false;

          // 멤버 (이름 매칭)
          if (selectedMemberName && tx.user_name !== selectedMemberName) return false;

          return true;
        });

        return { ...group, transactions };
      })
      .filter((g) => g.transactions.length > 0);
  }, [grouped, filters, start, end, selectedLocationName, selectedSupplierName, selectedProductName, selectedMemberName]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "입고":
        return <ArrowDownToLine className="w-4 h-4 text-blue-500" />;
      case "출고":
        return <ArrowUpToLine className="w-4 h-4 text-red-500" />;
      case "이동":
        return <ArrowLeftRight className="w-4 h-4 text-yellow-500" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-green-500" />;
    }
  };

  const getQuantityColor = (quantity: number) => {
    if (quantity > 0) return "text-blue-500";
    if (quantity < 0) return "text-red-500";
    return "text-gray-900";
  };

  return (
    <div className="overflow-auto space-y-6 custom-scrollbar">
      {filteredGrouped.map((group) => (
        <div key={group.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{group.date}</h2>
          <div className="space-y-2">
            {group.transactions.map((transaction) => (
              <div
                key={transaction.transaction_id + transaction.product_name}
                className="flex gap-4 items-center p-4 bg-white rounded-lg shadow-sm cursor-pointer"
                onClick={() => router.push(`/inventory/${transaction.transaction_id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/inventory/${transaction.transaction_id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex-shrink-0">{getTypeIcon(transaction.type_kr)}</div>
                <div className="flex-shrink-0">
                  <div className="overflow-hidden relative w-12 h-12 rounded-md bg-slate-100">
                    {(() => {
                      const product = products.find((p) => p.product_option_id === transaction.product_option_id);
                      const imageUrl = product?.image_url;
                      return imageUrl ? (
                        <Image src={imageUrl} alt={transaction.product_name} fill className="object-cover" loading="lazy" sizes="48px" />
                      ) : (
                        <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
                          {transaction.product_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center">
                    <span
                      className={`font-medium ${
                        transaction.type_kr === "입고"
                          ? "text-blue-500"
                          : transaction.type_kr === "출고"
                          ? "text-red-500"
                          : transaction.type_kr === "이동"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {transaction.type_kr}
                    </span>
                    <span className="text-sm text-gray-500">
                      {transaction.product_name}
                      {(() => {
                        const product = products.find((p) => p.product_option_id === transaction.product_option_id);
                        if (product && product.weight > 0) {
                          return (
                            <span className="ml-2 text-gray-400">
                              {formatWeightDisplay(product.weight, product.unit_label as "g" | "kg" | undefined)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </span>
                  </div>
                  {transaction.to_warehouse_name && <span className="text-sm text-gray-500">{transaction.to_warehouse_name}</span>}{" "}
                  {transaction.type_kr !== "이동" && (
                    <div className="mt-1 text-sm text-gray-500">총 재고: {transaction.total_stock.toLocaleString()}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className={`text-right ${getQuantityColor(transaction.quantity)}`}>
                    {transaction.quantity > 0 ? "+" : ""}
                    {transaction.quantity.toLocaleString()}
                  </div>
                  {/* <Avatar className="w-6 h-6">
                    <AvatarImage className="rounded-[12px]" src={transaction.user.avatar_url} alt={transaction.user.name} />
                    <AvatarFallback>{transaction.user.name[0]}</AvatarFallback>
                  </Avatar> */}
                  <div className="text-sm text-gray-500">{transaction.user_name ? transaction.user_name : "이름없음"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
