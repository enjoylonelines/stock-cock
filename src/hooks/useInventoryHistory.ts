import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { InventoryHistoryItem } from "@/types/inventory-history";
import { useInventories } from "./useInventories";

export interface InventoryTransaction {
  id: string;
  type: "입고" | "출고" | "조정";
  product_name: string;
  quantity: number;
  location?: string;
  note?: string;
  image_url?: string;
  total_stock: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  date: string; // yyyy년 MM월 dd일
  receipt_id: string;
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
        const { data, error } = await supabase
          .from("receipt_items")
          .select(
            `
            id,
            quantity,
            receipt:receipts (
              id,
              type,
              created_at,
              memo,
              location:locations (name),
              user:users (id, name, avatar_url)
            ),
            product:products (id, name, image_url)
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Query error:", error);
          return;
        }

        if (!data) return;

        // 1. inventory에서 product별 현재고를 가져옴
        const productCurrentStock: { [productId: string]: number } = {};
        inventories.forEach((inv) => {
          if (!productCurrentStock[inv.product_id]) productCurrentStock[inv.product_id] = 0;
          productCurrentStock[inv.product_id] += inv.quantity;
        });

        // 2. 로그를 최신순으로 정렬
        const logs = (data as unknown as InventoryHistoryItem[]).map((item) => {
          const typeKor = item.receipt.type === "IN" ? "입고" : item.receipt.type === "OUT" ? "출고" : "조정";
          const date = new Date(item.receipt.created_at);
          const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
          const productId = item.product.id;
          const productName = item.product.name;
          const quantity = item.quantity * (item.receipt.type === "OUT" ? -1 : 1);
          console.log(item.receipt.user);
          return {
            id: item.id,
            receipt_id: item.receipt.id,
            type: typeKor,
            product_id: productId,
            product_name: productName,
            quantity,
            location: item.receipt.location?.name,
            note: item.receipt.memo,
            image_url: item.product.image_url,
            user: {
              id: item.receipt.user?.id ?? "",
              name: item.receipt.user?.name || "-",
              avatar_url: item.receipt.user?.avatar_url,
            },
            date: dateStr,
            created_at: item.receipt.created_at,
          };
        });

        // 3. 누적 재고를 최신순에서 과거순으로 역계산
        const sortedLogs = logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const productStockMap = { ...productCurrentStock };
        const txs = sortedLogs.map((log) => {
          const stock = productStockMap[log.product_id] ?? 0;
          const result = {
            ...log,
            total_stock: stock,
            type: log.type as "입고" | "출고" | "조정",
          };
          // 다음 로그를 위해 수량을 빼줌 (입고/출고 방향 주의)
          productStockMap[log.product_id] -= log.quantity;
          return result;
        });

        // 날짜별 그룹화
        const groupedObj: { [date: string]: InventoryTransaction[] } = {};
        txs.forEach((tx) => {
          if (!groupedObj[tx.date]) groupedObj[tx.date] = [];
          groupedObj[tx.date].push(tx);
        });
        setGrouped(Object.entries(groupedObj).map(([date, transactions]) => ({ date, transactions })));
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };
    fetchData();
  }, [inventories]);

  return { grouped };
}
