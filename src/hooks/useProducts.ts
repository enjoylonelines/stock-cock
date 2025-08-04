import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ProductOptionView } from "@/types/product_option_view";

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
      setProducts(data || []);
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
