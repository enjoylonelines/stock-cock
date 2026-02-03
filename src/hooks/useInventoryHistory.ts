"use client";
import { createClient } from "@/lib/supabase/client";
import type { TransactionHistoryView } from "@/types/database";
import { useCallback, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import { useInventories } from "./useInventories";

export interface InventoryTransaction extends TransactionHistoryView {
  date: string;
  product_id: string;
  product_name: string;
  total_stock: number;
  type_kr: "입고" | "출고" | "이동" | "조정";
  image_url: string; //avatar
  broadcast_id: number;
}

export interface GroupedTransactions {
  date: string;
  transactions: InventoryTransaction[];
}

const supabase = createClient();

const processTransactionData = (
  data: TransactionHistoryView[],
  inventories: { product_option_id: string | null; quantity: number | null; weight_in_grams?: number | null }[]
) => {
  const mergedInventories: Record<string, number> = inventories.reduce(
    (acc, inv) => {
      if (!inv.product_option_id) return acc;
      if (!acc[inv.product_option_id]) acc[inv.product_option_id] = 0;
      // quantity 또는 weight_in_grams 사용
      acc[inv.product_option_id] += inv.quantity ?? inv.weight_in_grams ?? 0;
      return acc;
    },
    {} as Record<string, number>
  );

  // [1] inventories 기준으로 현재고 세팅
  const stockMap: Record<string, number> = { ...mergedInventories };

  type TxWithRequired = TransactionHistoryView & { product_option_id: string; created_at: string };
  const logs: InventoryTransaction[] = data
    .filter((tx): tx is TxWithRequired => Boolean(tx.product_option_id && tx.created_at))
    .map((tx, index) => {
      const product_id = tx.product_option_id;
      const dateObj = new Date(tx.created_at);
      const dateStr = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;

      let type_kr: InventoryTransaction["type_kr"];
      switch (tx.type) {
        case "in":
          type_kr = "입고";
          break;
        case "out":
          type_kr = "출고";
          break;
        case "move":
          type_kr = "이동";
          break;
        case "adjust":
          type_kr = "조정";
          break;
        default:
          type_kr = "입고";
      }

      const qty = tx.quantity ?? 0;
      const signedQuantity = tx.type === "out" ? -qty : qty;

      // [2] 현재 수량 기록 (거래가 적용되기 전 시점)
      const total_stock = stockMap[product_id] ?? 0;

      // [3] stockMap을 과거 방향으로 되돌림
      stockMap[product_id] = total_stock - signedQuantity;

      return {
        ...tx,
        product_id,
        product_name: tx.product_name ?? "",
        date: dateStr,
        type_kr,
        quantity: signedQuantity,
        total_stock, // 이 시점에서의 수량
        broadcast_id: data.length - index, // 최신 트랜잭션이 높은 ID
        image_url: tx.user_image_url ?? "", // avatar 이미지 URL
      };
    });

  // 최신순 → 날짜별 그룹화
  const groupedObj: { [date: string]: InventoryTransaction[] } = {};
  logs.forEach(tx => {
    if (!groupedObj[tx.date]) groupedObj[tx.date] = [];
    groupedObj[tx.date].push(tx);
  });

  const grouped = Object.entries(groupedObj).map(([date, transactions]) => ({
    date,
    transactions,
  }));

  return { grouped, transactions: logs };
};

export function useInventoryHistory() {
  const { inventories } = useInventories();
  const fetcher = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("transaction_history_view")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return processTransactionData(data || [], inventories);
    } catch (e) {
      console.error("[useInventoryHistory] fetcher error:", e);
      throw e;
    }
  }, [inventories]);

  const swrKey = ["inventory-history", inventories.length] as const;
  const swrKeyRef = useRef(swrKey);
  swrKeyRef.current = swrKey;

  const { data, isLoading, error } = useSWR<{
    grouped: GroupedTransactions[];
    transactions: InventoryTransaction[];
  }>(swrKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });
  // 실시간 구독 설정 (입출고 내역은 재고 유무와 관계없이 항상 표시)
  useEffect(() => {
    const channel = supabase
      .channel("transaction_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
        },
        () => mutate(swrKeyRef.current)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    grouped: data?.grouped || [],
    transactions: data?.transactions || [],
    loading: isLoading,
    error,
  };
}
