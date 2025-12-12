import { supabase } from "@/lib/supabase";
import useSWR from "swr";

interface Stats {
  totalStock: number;
  todayInbound: number;
  todayOutbound: number;
}

const fetcher = async () => {
  const today = new Date().toISOString().split("T")[0]; // '2025-06-30'

  const [transactionsResult, inventoryResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, created_at, transaction_items(quantity)")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
    supabase.from("inventory").select("quantity"),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  let inTotal = 0;
  let outTotal = 0;

  for (const tx of transactionsResult.data || []) {
    const qtySum = tx.transaction_items?.reduce((sum: number, item) => sum + Number(item.quantity), 0) || 0;
    if (tx.type === "in") inTotal += qtySum;
    if (tx.type === "out") outTotal += qtySum;
  }

  let sum = 0;
  for (const el of inventoryResult.data || []) {
    sum += el.quantity;
  }

  return { total: sum, in: inTotal, out: outTotal };
};

export function useStats() {
  const {
    data: summary = { total: 0, in: 0, out: 0 },
    isLoading,
    error,
  } = useSWR("stats", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000, // 30초마다 자동 갱신
  });

  return { summary, error, isLoading };
}
