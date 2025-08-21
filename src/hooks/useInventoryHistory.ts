"use client";
import { useEffect, useState } from "react";
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
}

export interface GroupedTransactions {
  date: string;
  transactions: InventoryTransaction[];
}
export function useInventoryHistory() {
  const [grouped, setGrouped] = useState<GroupedTransactions[]>([]);
  const { inventories } = useInventories();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from("transaction_history_view").select("*").order("created_at", { ascending: false }); // 최신순으로 불러오기

        if (error) {
          console.error("Query error:", error);
          return;
        }
        if (!data) return;

        const mergedInventories: Record<string, number> = inventories.reduce((acc, inv) => {
          if (!acc[inv.product_option_id]) acc[inv.product_option_id] = 0;
          acc[inv.product_option_id] += inv.quantity;
          return acc;
        }, {} as Record<string, number>);

        // [1] inventories 기준으로 현재고 세팅
        const stockMap: Record<string, number> = { ...mergedInventories };

        const logs: InventoryTransaction[] = data.map((tx) => {
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

        setGrouped(grouped);
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchData();
  }, [inventories]);
  return { grouped };
}
