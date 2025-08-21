import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Stats {
  totalStock: number;
  todayInbound: number;
  todayOutbound: number;
}

export function useStats() {
  const [summary, setSummary] = useState({ total: 0, in: 0, out: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0]; // '2025-06-30'

      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, created_at, transaction_items(quantity)")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (error) {
        setError(error.message);
        return;
      }

      let inTotal = 0;
      let outTotal = 0;

      for (const tx of data || []) {
        const qtySum = tx.transaction_items?.reduce((sum: number, item) => sum + Number(item.quantity), 0) || 0;
        if (tx.type === "in") inTotal += qtySum;
        if (tx.type === "out") outTotal += qtySum;
      }

      const { data: totalStock, error: inventoryError } = await supabase.from("inventory").select("quantity");

      if (inventoryError) {
        setError(inventoryError.message);
        return;
      }

      let sum = 0;
      for (const el of totalStock) {
        sum += el.quantity;
      }

      setSummary({ total: sum, in: inTotal, out: outTotal });
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return { summary, error, isLoading };
}
