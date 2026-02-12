"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useActivityReadStatus } from "@/hooks/useActivityReadStatus";
import { type TransactionHistoryItem, useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useProducts } from "@/hooks/useProducts";
import { formatStock } from "@/lib/domain/format";
import type { StockUnit } from "@/types/domain";
import { useActivityLogStore } from "@/store/activityLogStore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpDown, ArrowUpToLine, ChevronDown, ChevronRight, ChevronUp, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

/** 트랜잭션 ID별 그룹화 */
function groupByTransactionId(transactions: TransactionHistoryItem[]): TransactionHistoryItem[][] {
  const groups: Record<string, TransactionHistoryItem[]> = {};
  transactions.forEach((tx) => {
    const txId = tx.transaction_id ?? "";
    if (!groups[txId]) groups[txId] = [];
    groups[txId].push(tx);
  });
  return Object.values(groups).sort(
    (a, b) => new Date(b[0]?.created_at ?? 0).getTime() - new Date(a[0]?.created_at ?? 0).getTime()
  );
}

/** 그룹 내 항목 메시지 포맷 */
function formatLogMessage(transaction: TransactionHistoryItem, products: { productOptionId: string; stockUnit?: StockUnit }[]): string {
  const qty = transaction.quantity ?? 0;
  const product = products.find((p) => p.productOptionId === transaction.product_option_id);
  const stockUnit: StockUnit = product?.stockUnit ?? "EA";
  const qtyStr = formatStock(Math.abs(qty), stockUnit);

  switch (transaction.type) {
    case "in":
      return `${transaction.product_name} ${qtyStr}를 ${transaction.to_warehouse_name ?? ""}에 입고`;
    case "out":
      return `${transaction.product_name} ${qtyStr}를 ${transaction.from_warehouse_name ?? ""}에서 출고`;
    case "move":
      return `${transaction.product_name} ${qtyStr}를 ${transaction.from_warehouse_name ?? ""}에서 ${transaction.to_warehouse_name ?? ""}로 이동`;
    case "adjust":
      return `${transaction.product_name} 재고를 ${qty >= 0 ? "+" : "-"}${qtyStr}로 조정`;
    default:
      return `${transaction.product_name} ${qtyStr} 처리`;
  }
}

/** 토글형 트랜잭션 그룹 카드 */
function ActivityGroupCard({
  transactions,
  products,
  isRead,
  markGroupAsRead,
  getTypeIcon,
  getTypeColor,
  getTypeLabel,
  formatMsg,
  onDetailClick,
}: {
  transactions: TransactionHistoryItem[];
  products: { productOptionId: string; stockUnit?: StockUnit; imageUrl?: string | null }[];
  isRead: (tx: TransactionHistoryItem) => boolean;
  markGroupAsRead: (transactions: TransactionHistoryItem[]) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeColor: (type: string) => string;
  getTypeLabel: (type: string) => string;
  formatMsg: (tx: TransactionHistoryItem) => string;
  onDetailClick: (transactionId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const first = transactions[0];
  const hasMultiple = transactions.length > 1;
  const groupUnread = transactions.some((t) => !isRead(t));
  const firstProduct = products.find((p) => p.productOptionId === first.product_option_id);

  const handleClick = useCallback(() => {
    markGroupAsRead(transactions);
    if (hasMultiple) {
      setIsExpanded((prev) => !prev);
    } else {
      onDetailClick(first.transaction_id ?? "");
    }
  }, [hasMultiple, transactions, first.transaction_id, markGroupAsRead, onDetailClick]);

  const handleDetailClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      markGroupAsRead(transactions);
      onDetailClick(first.transaction_id ?? "");
    },
    [transactions, first.transaction_id, markGroupAsRead, onDetailClick],
  );

  return (
    <div className={`overflow-hidden rounded-lg transition-colors ${groupUnread ? "bg-blue-50 border-l-4 border-blue-400" : "bg-gray-50"}`}>
      <div
        className="flex gap-3 items-center p-3 cursor-pointer hover:bg-gray-100/80"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="mt-1 shrink-0">{getTypeIcon(first.type ?? "")}</div>
        <div className="shrink-0">
          <div className="overflow-hidden relative w-10 h-10 rounded-md bg-slate-100">
            {firstProduct?.imageUrl ? (
              <Image src={firstProduct.imageUrl} alt={first.product_name ?? ""} fill className="object-cover" loading="lazy" sizes="40px" />
            ) : (
              <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
                {first.product_name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-1">
            <span className={`font-medium ${getTypeColor(first.type ?? "")}`}>{getTypeLabel(first.type ?? "")}</span>
            {hasMultiple && (
              <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">외 {transactions.length - 1}개</span>
            )}
            <span className="text-xs text-gray-500">
              {first.created_at &&
                formatDistanceToNow(new Date(first.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
            </span>
          </div>
          <p className="text-sm text-gray-700">{formatMsg(first)}</p>
          <p className="text-xs text-gray-500">{first.user_name}</p>
        </div>
        <div className="mt-1 text-gray-400 shrink-0">
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

      {isExpanded && hasMultiple && (
        <div className="border-t border-gray-200">
          {transactions.slice(1).map((tx, idx) => (
            <div key={`${tx.transaction_id}-${tx.product_option_id}-${idx}`} className="px-3 py-2 pl-14 bg-white/60">
              <p className="text-sm text-gray-700">{formatMsg(tx)}</p>
              <p className="text-xs text-gray-500">{tx.product_name}</p>
            </div>
          ))}
          <div className="px-3 py-2 pl-14 border-t border-gray-100">
            <button type="button" className="text-sm text-blue-500 hover:text-blue-700" onClick={handleDetailClick}>
              상세보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivityLogDrawer() {
  const router = useRouter();
  const { isOpen, close } = useActivityLogStore();
  const { transactions, loading: historyLoading } = useTransactionHistory();
  const { products } = useProducts();
  const { isRead, markAsRead, getUnreadCount, loading: readsLoading } = useActivityReadStatus();

  const loading = historyLoading || readsLoading;
  const unreadCount = getUnreadCount(transactions);

  const groupedTransactions = useMemo(() => groupByTransactionId(transactions).slice(0, 15), [transactions]);

  const markGroupAsRead = useCallback(
    (txs: TransactionHistoryItem[]) => {
      const items = txs.map((t) => ({
        transaction_id: t.transaction_id ?? "",
        product_option_id: t.product_option_id ?? "",
      })).filter((item) => item.transaction_id && item.product_option_id);
      if (items.length > 0) markAsRead(items);
    },
    [markAsRead],
  );

  const handleDetailClick = useCallback(
    (transactionId: string) => {
      close();
      router.push(`/transactions/${transactionId}`);
    },
    [close, router],
  );

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case "in":
        return <ArrowDownToLine className="w-4 h-4 text-blue-500" />;
      case "out":
        return <ArrowUpToLine className="w-4 h-4 text-red-500" />;
      case "move":
        return <ArrowLeftRight className="w-4 h-4 text-yellow-500" />;
      case "adjust":
        return <ArrowUpDown className="w-4 h-4 text-green-500" />;
      default:
        return <ArrowUpDown className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "in":
        return "text-blue-600";
      case "out":
        return "text-red-600";
      case "move":
        return "text-yellow-600";
      case "adjust":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case "in":
        return "입고";
      case "out":
        return "출고";
      case "move":
        return "이동";
      case "adjust":
        return "조정";
      default:
        return "알 수 없음";
    }
  }, []);

  const formatMsg = useCallback((tx: TransactionHistoryItem) => formatLogMessage(tx, products), [products]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
      <DrawerContent className="h-[80vh] flex flex-col max-w-3xl mx-auto" role="dialog" aria-modal="true">
        <DrawerHeader className="py-0 shrink-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={close} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>
          <div className="flex justify-between items-center py-2 border-b-2 border-blue-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-blue-400">
                최근 활동
                {unreadCount > 0 && <span className="px-2 py-1 ml-2 text-xs text-white bg-red-500 rounded-full">{unreadCount}</span>}
              </DrawerTitle>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <p className="mb-2 text-lg font-medium">로딩 중...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <p className="mb-2 text-lg font-medium">활동 내역이 없습니다</p>
              <p className="text-sm">입고, 출고, 이동, 조정 활동이 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedTransactions.map((group) => (
                <ActivityGroupCard
                  key={group[0].transaction_id}
                  transactions={group}
                  products={products}
                  isRead={isRead}
                  markGroupAsRead={markGroupAsRead}
                  getTypeIcon={getTypeIcon}
                  getTypeColor={getTypeColor}
                  getTypeLabel={getTypeLabel}
                  formatMsg={formatMsg}
                  onDetailClick={handleDetailClick}
                />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
