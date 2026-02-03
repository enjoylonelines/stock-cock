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

  // Supabase 조인: product_options/products 는 단일 객체로 올 수 있음 (배열 아님)
  const getProductType = (item: unknown): string | undefined => {
    const raw = item as { product_options?: unknown };
    const po = raw.product_options;
    const option = Array.isArray(po) ? po[0] : po;
    const opts = option as { products?: unknown } | null | undefined;
    const p = opts?.products;
    const product = Array.isArray(p) ? p[0] : p;
    return (product as { product_type?: string } | null)?.product_type;
  };

  let inTotal = 0;
  let outTotal = 0;
  let materialOutGrams = 0;

  for (const tx of transactionsResult.data || []) {
    const items = Array.isArray(tx.transaction_items) ? tx.transaction_items : [];
    const nonMaterialItems = items.filter(item => getProductType(item) !== "material");
    const materialItems = items.filter(item => getProductType(item) === "material");

    const qtySum = nonMaterialItems.reduce((sum: number, item) => {
      const quantity = (item as unknown as { quantity: number | string }).quantity;
      return sum + Number(quantity);
    }, 0);
    if (tx.type === "in") inTotal += qtySum;
    if (tx.type === "out") outTotal += qtySum;

    if (tx.type === "out") {
      materialOutGrams += materialItems.reduce((sum: number, item) => {
        const quantity = (item as unknown as { quantity: number | string }).quantity;
        return sum + Number(quantity);
      }, 0);
    }
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

  return { total: sum, in: inTotal, out: outTotal, materialOutGrams };
};

/**
 * 통계 데이터 훅 (Home 전용)
 */
export function useStats() {
  const {
    data: summary = { total: 0, in: 0, out: 0, materialOutGrams: 0 },
    isLoading,
    error,
  } = useSWR("stats", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000, // 30초마다 자동 갱신
  });

  return { summary, error, isLoading };
}
