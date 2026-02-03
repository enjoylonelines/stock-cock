"use client";
import type { GroupedTransactions, InventoryTransaction } from "@/hooks/useInventoryHistory";
import { useProducts } from "@/hooks/useProducts";
import { isMaterialItem } from "@/lib/domain/inventory";
import { formatWeightDisplay } from "@/lib/utils";
import type { DomainInventoryItem } from "@/types/domain";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpDown, ArrowUpToLine, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";

/**
 * 트랜잭션 ID별로 그룹화
 */
const groupByTransactionId = (transactions: InventoryTransaction[]): InventoryTransaction[][] => {
  const groups: Record<string, InventoryTransaction[]> = {};
  transactions.forEach((tx) => {
    const txId = tx.transaction_id ?? "";
    if (!groups[txId]) groups[txId] = [];
    groups[txId].push(tx);
  });
  // 최신순 유지 (첫 번째 항목의 broadcast_id 기준)
  return Object.values(groups).sort((a, b) => b[0].broadcast_id - a[0].broadcast_id);
};

/**
 * 수량 포매팅 (원재료: kg, 완제품: 봉)
 */
const formatQuantityDisplay = (quantity: number, product: DomainInventoryItem | undefined): string => {
  const sign = quantity > 0 ? "+" : "";
  const absQuantity = Math.abs(quantity);

  if (product && isMaterialItem(product)) {
    // 원재료: g → kg 변환
    const kg = absQuantity / 1000;
    const formatted = kg % 1 === 0 ? kg.toString() : kg.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${quantity < 0 ? "-" : ""}${formatted}kg`;
  }
  // 완제품: n봉
  return `${sign}${quantity.toLocaleString()}봉`;
};

/**
 * 개별 트랜잭션 아이템 컴포넌트
 */
const TransactionItem = memo(function TransactionItem({
  transaction,
  products,
  getTypeIcon,
  getQuantityColor,
  showType = true,
  compact = false,
}: {
  transaction: InventoryTransaction;
  products: DomainInventoryItem[];
  getTypeIcon: (type: string) => React.ReactNode;
  getQuantityColor: (quantity: number) => string;
  showType?: boolean;
  compact?: boolean;
}) {
  const product = products.find((p) => p.productOptionId === transaction.product_option_id);
  return (
    <div className={`flex gap-4 items-center ${compact ? "py-2" : ""}`}>
      {showType && <div className="shrink-0">{getTypeIcon(transaction.type_kr)}</div>}
      <div className="shrink-0">
        <div className={`overflow-hidden relative rounded-md bg-slate-100 ${compact ? "w-10 h-10" : "w-12 h-12"}`}>
          {product?.imageUrl ? (
            <Image src={product.imageUrl} alt={transaction.product_name} fill className="object-cover" loading="lazy" sizes="48px" />
          ) : (
            <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
              {transaction.product_name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-center">
          {showType && (
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
          )}
          <span className="text-sm text-gray-500">
            {transaction.product_name}
            {product && product.weight > 0 && (
              <span className="ml-2 text-gray-400">{formatWeightDisplay(product.weight, product.unitLabel as "g" | "kg" | undefined)}</span>
            )}
          </span>
        </div>
        {!compact && transaction.to_warehouse_name && <span className="text-sm text-gray-500">{transaction.to_warehouse_name}</span>}
        {!compact && transaction.type_kr !== "이동" && (
          <div className="mt-1 text-sm text-gray-500">총 재고: {transaction.total_stock.toLocaleString()}</div>
        )}
      </div>
      <div className="flex flex-col items-end">
        <div className={`text-right ${getQuantityColor(transaction.quantity ?? 0)}`}>
          {formatQuantityDisplay(transaction.quantity ?? 0, product)}
        </div>
        {!compact && <div className="text-sm text-gray-500">{transaction.user_name ? transaction.user_name : "이름없음"}</div>}
      </div>
    </div>
  );
});

/**
 * 트랜잭션 그룹 컴포넌트 (토글 가능)
 */
const TransactionGroup = memo(function TransactionGroup({
  transactions,
  products,
  getTypeIcon,
  getQuantityColor,
  onDetailClick,
}: {
  transactions: InventoryTransaction[];
  products: DomainInventoryItem[];
  getTypeIcon: (type: string) => React.ReactNode;
  getQuantityColor: (quantity: number) => string;
  onDetailClick: (transactionId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const firstTransaction = transactions[0];
  const hasMultiple = transactions.length > 1;
  const firstProduct = products.find((p) => p.productOptionId === firstTransaction.product_option_id);

  const handleCardClick = useCallback(() => {
    if (hasMultiple) {
      setIsExpanded((prev) => !prev);
    } else {
      onDetailClick(firstTransaction.transaction_id ?? "");
    }
  }, [hasMultiple, onDetailClick, firstTransaction.transaction_id]);

  const handleDetailClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDetailClick(firstTransaction.transaction_id ?? "");
    },
    [firstTransaction.transaction_id, onDetailClick],
  );

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-sm">
      {/* 메인 카드 (첫 번째 항목) */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex gap-4 items-center">
          <div className="shrink-0">{getTypeIcon(firstTransaction.type_kr)}</div>
          <div className="shrink-0">
            <div className="overflow-hidden relative w-12 h-12 rounded-md bg-slate-100">
              {firstProduct?.imageUrl ? (
                <Image
                  src={firstProduct.imageUrl}
                  alt={firstTransaction.product_name}
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="48px"
                />
              ) : (
                <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
                  {firstTransaction.product_name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 items-center">
              <span
                className={`font-medium ${
                  firstTransaction.type_kr === "입고"
                    ? "text-blue-500"
                    : firstTransaction.type_kr === "출고"
                      ? "text-red-500"
                      : firstTransaction.type_kr === "이동"
                        ? "text-yellow-500"
                        : "text-green-500"
                }`}
              >
                {firstTransaction.type_kr}
              </span>
              <span className="text-sm text-gray-500">
                {firstTransaction.product_name}
                {firstProduct && firstProduct.weight > 0 && (
                  <span className="ml-2 text-gray-400">
                    {formatWeightDisplay(firstProduct.weight, firstProduct.unitLabel as "g" | "kg" | undefined)}
                  </span>
                )}
              </span>
              {hasMultiple && (
                <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  외 {transactions.length - 1}개
                </span>
              )}
            </div>
            {firstTransaction.to_warehouse_name && <span className="text-sm text-gray-500">{firstTransaction.to_warehouse_name}</span>}
            {firstTransaction.type_kr !== "이동" && (
              <div className="mt-1 text-sm text-gray-500">총 재고: {firstTransaction.total_stock.toLocaleString()}</div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className={`text-right ${getQuantityColor(firstTransaction.quantity ?? 0)}`}>
              {formatQuantityDisplay(firstTransaction.quantity ?? 0, firstProduct)}
            </div>
            <div className="text-sm text-gray-500">{firstTransaction.user_name ? firstTransaction.user_name : "이름없음"}</div>
          </div>
          {/* 오른쪽 아이콘 영역 - 레이아웃 일관성 유지 */}
          <div className="w-5 text-gray-400 shrink-0">
            {hasMultiple ? (
              isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* 펼쳐진 추가 항목들 */}
      {isExpanded && hasMultiple && (
        <div className="border-t border-gray-100">
          {transactions.slice(1).map((tx, index) => (
            <div
              key={`${tx.transaction_id}-${tx.product_option_id}-${index}`}
              className="px-4 py-3 bg-gray-50 border-b border-gray-50 last:border-b-0"
            >
              <TransactionItem
                transaction={tx}
                products={products}
                getTypeIcon={getTypeIcon}
                getQuantityColor={getQuantityColor}
                showType={false}
                compact={true}
              />
            </div>
          ))}
          {/* 상세보기 버튼 */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <button type="button" className="py-2 w-full text-sm text-center text-gray-600 hover:text-gray-900" onClick={handleDetailClick}>
              상세보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

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

  const handleDetailClick = useCallback(
    (transactionId: string) => {
      router.push(`/inventory/${transactionId}`);
    },
    [router],
  );

  // 날짜별 그룹 내에서 transaction_id별로 그룹화
  const groupedByDate = useMemo(() => {
    return grouped.map((dateGroup) => ({
      date: dateGroup.date,
      transactionGroups: groupByTransactionId(dateGroup.transactions),
    }));
  }, [grouped]);

  return (
    <div className="overflow-auto space-y-6 custom-scrollbar">
      {groupedByDate.map((dateGroup) => (
        <div key={dateGroup.date} className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500">{dateGroup.date}</h2>
          <div className="space-y-2">
            {dateGroup.transactionGroups.map((transactions) => (
              <TransactionGroup
                key={transactions[0].transaction_id}
                transactions={transactions}
                products={products}
                getTypeIcon={getTypeIcon}
                getQuantityColor={getQuantityColor}
                onDetailClick={handleDetailClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

InventoryList.displayName = "InventoryList";

export default InventoryList;
