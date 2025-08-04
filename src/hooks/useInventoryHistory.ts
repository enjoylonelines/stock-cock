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
        const { data, error } = await supabase.from("transaction_history_view").select("*").order("created_at", { ascending: false });

        if (error) {
          console.error("Query error:", error);
          return;
        }

        if (!data) return;

        // 현재고: product_option_id 기준
        const currentStock: Record<string, number> = {};
        inventories.forEach((inv) => {
          if (!currentStock[inv.product_option_id]) currentStock[inv.product_option_id] = 0;
          currentStock[inv.product_option_id] += inv.quantity;
        });

        const logs = data.map((tx) => {
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

          return {
            ...tx,
            product_id,
            product_name: tx.product_name,
            date: dateStr,
            type_kr,
            quantity: signedQuantity,
          };
        });

        // 최신순 → 누적 재고 계산
        const sorted = logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const stockMap = { ...currentStock };
        const txs = sorted.map((log) => {
          const stock = stockMap[log.product_id] ?? 0;
          const result = {
            ...log,
            total_stock: stock,
          };
          stockMap[log.product_id] -= log.quantity;
          return result;
        });

        // 날짜별 그룹화
        const groupedObj: { [date: string]: InventoryTransaction[] } = {};
        txs.forEach((tx) => {
          if (!groupedObj[tx.date]) groupedObj[tx.date] = [];
          groupedObj[tx.date].push(tx);
        });

        setGrouped(Object.entries(groupedObj).map(([date, transactions]) => ({ date, transactions })));
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchData();
  }, [inventories]);

  return { grouped };
}
