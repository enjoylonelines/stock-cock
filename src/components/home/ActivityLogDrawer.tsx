"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X, ArrowDownToLine, ArrowUpToLine, ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { useActivityLogStore } from "@/store/activityLogStore";
import { useInventoryHistory, InventoryTransaction } from "@/hooks/useInventoryHistory";
import { useBroadcastReadStatus } from "@/hooks/useBroadcastReadStatus";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ActivityLogDrawer() {
  const { isOpen, close } = useActivityLogStore();
  const { transactions, loading: historyLoading } = useInventoryHistory();
  const { isRead, markAsRead, getUnreadCount, loading: readsLoading } = useBroadcastReadStatus();

  const loading = historyLoading || readsLoading;
  const unreadCount = getUnreadCount(transactions);

  const getTypeIcon = (type: string) => {
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
  };

  const getTypeColor = (type: string) => {
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
  };

  const getTypeLabel = (type: string) => {
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
  };

  const formatLogMessage = (transaction: InventoryTransaction) => {
    switch (transaction.type) {
      case "in":
        return `${transaction.product_name} ${transaction.quantity}개를 ${transaction.to_warehouse_name}에 입고`;
      case "out":
        return `${transaction.product_name} ${-transaction.quantity}개를 ${transaction.from_warehouse_name}에서 출고`;
      case "move":
        return `${transaction.product_name} ${transaction.quantity}개를 ${transaction.from_warehouse_name}에서 ${transaction.to_warehouse_name}로 이동`;
      case "adjust":
        return `${transaction.product_name} 재고를 ${transaction.quantity > 0 ? "+" : ""}${transaction.quantity}개로 조정`;
      default:
        return `${transaction.product_name} ${transaction.quantity}개 처리`;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
      <DrawerContent className="h-[80vh] flex flex-col" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
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
              <div className="text-center">
                <p className="mb-2 text-lg font-medium">로딩 중...</p>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <div className="text-center">
                <p className="mb-2 text-lg font-medium">활동 내역이 없습니다</p>
                <p className="text-sm">입고, 출고, 이동, 조정 활동이 여기에 표시됩니다</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 20).map((transaction) => {
                const isTransactionRead = isRead(transaction.broadcast_id);
                return (
                  <div
                    key={transaction.broadcast_id}
                    className={`flex gap-3 items-start p-3 rounded-lg cursor-pointer transition-colors ${
                      isTransactionRead ? "bg-gray-50" : "bg-blue-50 border-l-4 border-blue-400"
                    }`}
                    onClick={() => markAsRead(transaction.broadcast_id)}
                  >
                    <div className="flex-shrink-0 mt-1">{getTypeIcon(transaction.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center mb-1">
                        <span className={`font-medium ${getTypeColor(transaction.type)}`}>{getTypeLabel(transaction.type)}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                      <p className="mb-1 text-sm text-gray-700">{formatLogMessage(transaction)}</p>
                      <p className="text-xs text-gray-500">{transaction.user_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
