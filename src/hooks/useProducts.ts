import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/database/product";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("v_product_sku_inventory").select("*").order("product_name");

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
