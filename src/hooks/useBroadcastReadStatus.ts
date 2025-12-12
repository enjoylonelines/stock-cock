"use client";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

export function useBroadcastReadStatus() {
  const [lastReadBroadcastId, setLastReadBroadcastId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const user = useUser();

  const fetchReadStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_read_status")
        .select("last_read_broadcast_id")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116은 데이터가 없을 때
        console.error("읽음 상태 조회 오류:", error);
        return;
      }

      setLastReadBroadcastId(data?.last_read_broadcast_id || 0);
    } catch (error) {
      console.error("읽음 상태 조회 중 오류:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReadStatus();
  }, [fetchReadStatus]);

  const markAsRead = async (broadcastId: number) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("user_read_status").upsert(
        {
          user_id: user.id,
          last_read_broadcast_id: broadcastId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.error("읽음 처리 오류:", error);
        return;
      }

      // 로컬 상태 업데이트
      setLastReadBroadcastId(broadcastId);
    } catch (error) {
      console.error("읽음 처리 중 오류:", error);
    }
  };

  const markAllAsRead = async (latestBroadcastId: number) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("user_read_status").upsert(
        {
          user_id: user.id,
          last_read_broadcast_id: latestBroadcastId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.error("전체 읽음 처리 오류:", error);
        return;
      }

      // 로컬 상태 업데이트
      setLastReadBroadcastId(latestBroadcastId);
    } catch (error) {
      console.error("전체 읽음 처리 중 오류:", error);
    }
  };

  const isRead = (broadcastId: number) => {
    return broadcastId <= lastReadBroadcastId;
  };

  const getUnreadCount = (transactions: { broadcast_id?: number }[]): number => {
    return transactions.filter(tx => !isRead(tx.broadcast_id || 0)).length;
  };

  // 실시간 구독 설정 - 새로운 트랜잭션이 추가되면 읽지 않은 알람 개수 업데이트
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("user_read_status_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
        },
        () => {
          // 새로운 트랜잭션이 추가되면 읽지 않은 알람 개수가 증가할 수 있으므로
          // UI가 자동으로 업데이트되도록 함 (transactions 배열이 변경되면 getUnreadCount가 재계산됨)
          console.log("새로운 트랜잭션으로 인한 알람 업데이트");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    loading,
    lastReadBroadcastId,
    markAsRead,
    markAllAsRead,
    isRead,
    getUnreadCount,
  };
}
