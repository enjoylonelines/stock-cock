"use client";
import type { GroupedTransactions } from "@/hooks/useInventoryHistory";
import type { ProductOptionView } from "@/types/database";
import { useProducts } from "@/hooks/useProducts";
import { formatWeightDisplay } from "@/lib/utils";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpDown, ArrowUpToLine } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";

/**
 * 재고 목록 컴포넌트 (순수 UI)
 * 필터링된 데이터를 받아서 표시만 담당
 */
const InventoryList = memo(function InventoryList({ grouped }: { grouped: GroupedTransactions[] }) {
  const router = useRouter();
  const { products } = useProducts();

  const getTypeIcon = useCallback((type: string) => {
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
  }, []);

  const getQuantityColor = useCallback((quantity: number) => {
    if (quantity > 0) return "text-blue-500";
    if (quantity < 0) return "text-red-500";
    return "text-gray-900";
  }, []);

  const handleTransactionClick = useCallback(
    (transactionId: string) => {
      router.push(`/inventory/${transactionId}`);
    },
    [router]
  );

  return (
    <div className="overflow-auto space-y-6 custom-scrollbar">
      {grouped.map(group => (
        <div key={group.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{group.date}</h2>
          <div className="space-y-2">
            {group.transactions.map((transaction, index) => (
              <div
                key={`${transaction.transaction_id}-${transaction.product_option_id}-${index}`}
                className="flex gap-4 items-center p-4 bg-white rounded-lg shadow-sm cursor-pointer"
                onClick={() => handleTransactionClick(transaction.transaction_id)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTransactionClick(transaction.transaction_id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex-shrink-0">{getTypeIcon(transaction.type_kr)}</div>
                <div className="flex-shrink-0">
                  <div className="overflow-hidden relative w-12 h-12 rounded-md bg-slate-100">
                    {(() => {
                      const product = products.find(p => p.product_option_id === transaction.product_option_id);
                      const imageUrl = product?.image_url;
                      return imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={transaction.product_name}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="48px"
                        />
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
                        const product = products.find(p => p.product_option_id === transaction.product_option_id);
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
                  {transaction.to_warehouse_name && (
                    <span className="text-sm text-gray-500">{transaction.to_warehouse_name}</span>
                  )}{" "}
                  {transaction.type_kr !== "이동" && (
                    <div className="mt-1 text-sm text-gray-500">
                      총 재고: {transaction.total_stock.toLocaleString()}
                    </div>
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
                  <div className="text-sm text-gray-500">
                    {transaction.user_name ? transaction.user_name : "이름없음"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

InventoryList.displayName = "InventoryList";

export default InventoryList;
