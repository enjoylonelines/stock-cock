import { supabase } from "@/lib/supabase";
import type { ProductOptionView } from "@/types/product_option_view";
import useSWR from "swr";

function groupProductsByOption(products: ProductOptionView[]) {
  const map: Record<string, ProductOptionView> = {};

  products.forEach(p => {
    if (!map[p.product_option_id]) {
      // 처음 들어온 상품이면 복사해서 넣음
      map[p.product_option_id] = { ...p };
    } else {
      // 이미 있으면 quantity 누적
      map[p.product_option_id].quantity += p.quantity;
    }
  });

  // 다시 배열로 변환
  return Object.values(map);
}

const fetcher = async () => {
  const { data, error } = await supabase.from("product_option_inventory_view").select("*").order("product_name");
  if (error) throw error;
  return groupProductsByOption(data || []);
};

export function useProducts() {
  const {
    data: products = [],
    isLoading,
    error,
  } = useSWR<ProductOptionView[]>("products", fetcher, {
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
  const fetcher = async (id: string) => {
    const { data, error } = await supabase
      .from("product_option_inventory_view")
      .select("*")
      .eq("product_option_id", id)
      .order("product_name")
      .limit(1)
      .single();

    if (error) throw error;
    return data as ProductOptionView;
  };

  const {
    data: product,
    isLoading,
    error,
  } = useSWR<ProductOptionView>(
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
