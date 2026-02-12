"use client";

import { getActivityReadKey, useActivityReadStatusStore } from "@/store/activityReadStatusStore";
import { useUser } from "@/contexts/UserContext";
import { createClient } from "@/lib/supabase/client";
import { clientLogger } from "@/utils/client-logger";
import { useCallback, useEffect, useState } from "react";

export interface ActivityReadItem {
  transaction_id: string;
  product_option_id: string;
}

export function useActivityReadStatus() {
  const { readActivityKeys, setReadActivityKeys, addReadKeys } = useActivityReadStatusStore();
  const [loading, setLoading] = useState(true);
  const user = useUser();
  const supabase = createClient();

  const fetchReadStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_activity_read")
        .select("transaction_id, product_option_id")
        .eq("user_id", user.id);

      if (error) {
        clientLogger.error("읽음 상태 조회 오류", error);
        return;
      }

      const keys = new Set<string>(
        (data ?? []).map(row => getActivityReadKey(row.transaction_id, row.product_option_id))
      );
      setReadActivityKeys(keys);
    } catch (error) {
      clientLogger.error("읽음 상태 조회 중 오류", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setReadActivityKeys]);

  useEffect(() => {
    fetchReadStatus();
  }, [fetchReadStatus]);

  const markAsRead = useCallback(
    async (items: ActivityReadItem[]) => {
      if (!user?.id || items.length === 0) return;

      const rows = items.map(({ transaction_id, product_option_id }) => ({
        user_id: user.id,
        transaction_id,
        product_option_id,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("user_activity_read").upsert(rows, {
        onConflict: "user_id,transaction_id,product_option_id",
      });

      if (error) {
        clientLogger.error("읽음 처리 오류", error);
        return;
      }

      const keys = items.map(({ transaction_id, product_option_id }) =>
        getActivityReadKey(transaction_id, product_option_id)
      );
      addReadKeys(keys);
    },
    [user?.id, addReadKeys]
  );

  const markAllAsRead = useCallback(
    async (items: ActivityReadItem[]) => {
      await markAsRead(items);
    },
    [markAsRead]
  );

  const isRead = useCallback(
    (tx: { transaction_id?: string | null; product_option_id?: string | null }) => {
      const txId = tx.transaction_id ?? "";
      const optId = tx.product_option_id ?? "";
      if (!txId || !optId) return false;
      return readActivityKeys.has(getActivityReadKey(txId, optId));
    },
    [readActivityKeys]
  );

  const getUnreadCount = useCallback(
    (transactions: { transaction_id?: string | null; product_option_id?: string | null }[]): number => {
      return transactions.filter(tx => !isRead(tx)).length;
    },
    [isRead]
  );

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("activity_read_status_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
        },
        () => {
          clientLogger.debug("새 트랜잭션으로 알람 업데이트");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    loading,
    markAsRead,
    markAllAsRead,
    isRead,
    getUnreadCount,
    fetchReadStatus,
  };
}
