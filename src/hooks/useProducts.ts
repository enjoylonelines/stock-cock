import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { ProductOptionView } from "@/types/product_option_view";

function groupProductsByOption(products: ProductOptionView[]) {
  const map: Record<string, ProductOptionView> = {};

  products.forEach((p) => {
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
  const { data: products = [], isLoading, error } = useSWR<ProductOptionView[]>("products", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    products,
    isLoading,
    error,
  };
}
