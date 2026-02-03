import { toInventoryItems } from "@/lib/domain/inventory";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { DomainInventoryItem } from "@/types/domain";
import useSWR from "swr";

type ProductOptionInventoryViewRow = Database["public"]["Views"]["product_option_inventory_view"]["Row"];

/**
 * View Row → Domain Item 변환 후 product_option_id 기준 그룹핑
 * (동일 제품의 여러 창고 재고를 합산)
 */
function groupAndConvert(rows: ProductOptionInventoryViewRow[]): DomainInventoryItem[] {
  // 먼저 도메인 타입으로 변환
  const items = toInventoryItems(rows);

  // product_option_id 기준 그룹핑 및 재고 합산
  const map: Record<string, DomainInventoryItem> = {};

  items.forEach(item => {
    if (!map[item.productOptionId]) {
      map[item.productOptionId] = { ...item };
    } else {
      // 이미 있으면 stock 누적
      map[item.productOptionId].stock += item.stock;
    }
  });

  return Object.values(map);
}

const supabase = createClient();

const fetcher = async () => {
  const { data, error } = await supabase.from("product_option_inventory_view").select("*").order("product_name");
  if (error) throw error;
  return groupAndConvert(data || []);
};

export function useProducts() {
  const {
    data: products = [],
    isLoading,
    error,
  } = useSWR<DomainInventoryItem[]>("products", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    products,
    isLoading,
    error,
  };
}

// 개별 제품만 가져오는 hook (성능 최적화)
export function useProduct(productOptionId: string | null) {
  const fetcher = async (id: string): Promise<DomainInventoryItem | null> => {
    const { data, error } = await supabase
      .from("product_option_inventory_view")
      .select("*")
      .eq("product_option_id", id)
      .order("product_name")
      .limit(1)
      .single();

    if (error) throw error;

    // 도메인 타입으로 변환
    const items = toInventoryItems(data ? [data] : []);
    return items[0] ?? null;
  };

  const {
    data: product,
    isLoading,
    error,
  } = useSWR<DomainInventoryItem | null>(
    productOptionId ? ["product", productOptionId] : null,
    ([, id]: [string, string]) => fetcher(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    product,
    isLoading,
    error,
  };
}
