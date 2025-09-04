"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useInventories } from "./useInventories";
import { TransactionHistoryView } from "@/types/database";

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
export function useInventoryHistory() {
  const [grouped, setGrouped] = useState<GroupedTransactions[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { inventories } = useInventories();

  const processTransactionData = useCallback(
    (data: TransactionHistoryView[]) => {
      const mergedInventories: Record<string, number> = inventories.reduce((acc, inv) => {
        if (!acc[inv.product_option_id]) acc[inv.product_option_id] = 0;
        acc[inv.product_option_id] += inv.quantity;
        return acc;
      }, {} as Record<string, number>);

      // [1] inventories 기준으로 현재고 세팅
      const stockMap: Record<string, number> = { ...mergedInventories };

      const logs: InventoryTransaction[] = data.map((tx, index) => {
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

        const signedQuantity = tx.type === "out" ? -tx.quantity : tx.quantity;

        // [2] 현재 수량 기록 (거래가 적용되기 전 시점)
        const total_stock = stockMap[product_id] ?? 0;

        // [3] stockMap을 과거 방향으로 되돌림
        stockMap[product_id] = total_stock - signedQuantity;

        return {
          ...tx,
          product_id,
          product_name: tx.product_name,
          date: dateStr,
          type_kr,
          quantity: signedQuantity,
          total_stock, // 이 시점에서의 수량
          broadcast_id: data.length - index, // 최신 트랜잭션이 높은 ID
          image_url: tx.user_image_url, // avatar 이미지 URL
        };
      });

      // 최신순 → 날짜별 그룹화
      const groupedObj: { [date: string]: InventoryTransaction[] } = {};
      logs.forEach((tx) => {
        if (!groupedObj[tx.date]) groupedObj[tx.date] = [];
        groupedObj[tx.date].push(tx);
      });

      const grouped = Object.entries(groupedObj).map(([date, transactions]) => ({
        date,
        transactions,
      }));

      return { grouped, transactions: logs };
    },
    [inventories]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from("transaction_history_view").select("*").order("created_at", { ascending: false }); // 최신순으로 불러오기

        if (error) {
          console.error("Query error:", error);
          return;
        }
        if (!data) return;

        const { grouped, transactions } = processTransactionData(data);
        setGrouped(grouped);
        setTransactions(transactions);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [inventories, processTransactionData]);

  // 실시간 구독 설정
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
        async (payload) => {
          console.log("새로운 트랜잭션 감지:", payload);
          // 새로운 트랜잭션이 추가되면 데이터를 다시 불러옴
          try {
            const { data, error } = await supabase.from("transaction_history_view").select("*").order("created_at", { ascending: false });

            if (error) {
              console.error("실시간 업데이트 오류:", error);
              return;
            }
            if (!data) return;

            const { grouped, transactions } = processTransactionData(data);
            setGrouped(grouped);
            setTransactions(transactions);
          } catch (err) {
            console.error("실시간 업데이트 중 오류:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processTransactionData]);

  return { grouped, transactions, loading };
}
