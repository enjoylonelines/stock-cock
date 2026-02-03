import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";

const fetcher = async () => {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0]; // '2025-06-30'

  const [transactionsResult, inventoryResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(`
        id, 
        type, 
        created_at, 
        transaction_items!inner(
          quantity,
          product_options!inner(
            products!inner(product_type)
          )
        )
      `)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
    supabase.from("inventory").select(`
        quantity,
        product_options!inner(
          product_id,
          products!inner(product_type)
        )
      `),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  let inTotal = 0;
  let outTotal = 0;

  // 원재료가 아닌 transaction_items만 계산
  for (const tx of transactionsResult.data || []) {
    const items = tx.transaction_items || [];
    const nonMaterialItems = items.filter(item => {
      const productOptions = (
        item as unknown as {
          product_options?: Array<{ products?: Array<{ product_type?: string }> }>;
        }
      ).product_options;
      const firstOption = productOptions?.[0];
      const firstProduct = firstOption?.products?.[0];
      return firstProduct?.product_type !== "material";
    });

    const qtySum = nonMaterialItems.reduce((sum: number, item) => {
      const quantity = (item as unknown as { quantity: number | string }).quantity;
      return sum + Number(quantity);
    }, 0);
    if (tx.type === "in") inTotal += qtySum;
    if (tx.type === "out") outTotal += qtySum;
  }

  // 원재료가 아닌 inventory만 계산
  let sum = 0;
  for (const el of inventoryResult.data || []) {
    // Supabase의 !inner 조인은 단일 객체를 반환
    const productOptions = el.product_options as unknown as { products?: { product_type?: string } } | null | undefined;

    const productType = productOptions?.products?.product_type;

    // product_type이 없거나 material이 아닌 경우에만 합산
    // (product_type이 null/undefined인 경우도 포함하여 안전하게 처리)
    if (productType !== "material") {
      sum += Number(el.quantity);
    }
  }

  return { total: sum, in: inTotal, out: outTotal };
};

/**
 * 통계 데이터 훅 (Home 전용)
 */
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
