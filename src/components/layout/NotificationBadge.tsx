"use client";

import { useActivityReadStatus } from "@/hooks/useActivityReadStatus";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";

export default function NotificationBadge() {
  const { getUnreadCount } = useActivityReadStatus();
  const { transactions } = useTransactionHistory();
  const unreadCount = getUnreadCount(transactions);

  if (unreadCount === 0) return null;

  return <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />;
}
