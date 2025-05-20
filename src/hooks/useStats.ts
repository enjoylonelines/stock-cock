import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface Stats {
  totalStock: number;
  todayInbound: number;
  todayOutbound: number;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    totalStock: 0,
    todayInbound: 0,
    todayOutbound: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);
        const today = format(new Date(), "yyyy-MM-dd");

        // 총 재고 수량 조회
        const { data: inventoryData, error: inventoryError } = await supabase.from("inventory").select("quantity");

        if (inventoryError) throw inventoryError;

        const totalStock = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0);

        // 오늘의 입/출고 수량 조회
        const { data: receiptsData, error: receiptsError } = await supabase
          .from("receipts")
          .select(
            `
            type,
            receipt_items (
              quantity
            )
          `
          )
          .eq("status", "COMPLETED")
          .gte("created_at", `${today} 00:00:00`)
          .lte("created_at", `${today} 23:59:59`);

        if (receiptsError) throw receiptsError;

        const todayInbound = receiptsData
          .filter((receipt) => receipt.type === "IN")
          .reduce((sum, receipt) => sum + receipt.receipt_items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0);

        const todayOutbound = receiptsData
          .filter((receipt) => receipt.type === "OUT")
          .reduce((sum, receipt) => sum + receipt.receipt_items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0);

        setStats({
          totalStock,
          todayInbound,
          todayOutbound,
        });
      } catch (err) {
        console.log(err);
        setError(err instanceof Error ? err : new Error("통계 데이터를 가져오는데 실패했습니다."));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, isLoading, error };
}
