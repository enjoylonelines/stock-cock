import { useState, useEffect } from "react";
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

export function useProducts() {
  const [products, setProducts] = useState<ProductOptionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("product_option_inventory_view").select("*").order("product_name");
      if (error) throw error;
      const groupedProducts = groupProductsByOption(data);
      setProducts(groupedProducts);
    } catch (error) {
      console.error("Error fetching product options view:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    products,
    isLoading,
  };
}
