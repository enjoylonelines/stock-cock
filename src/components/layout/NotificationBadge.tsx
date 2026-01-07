"use client";

import { useBroadcastReadStatus } from "@/hooks/useBroadcastReadStatus";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";

export default function NotificationBadge() {
  const { getUnreadCount } = useBroadcastReadStatus();
  const { transactions } = useInventoryHistory();
  const unreadCount = getUnreadCount(transactions);

  if (unreadCount === 0) return null;

  return <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />;
}
