import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/product";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*").order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase.from("products").insert(product).select().single();

      if (error) throw error;
      setProducts((prev) => [...prev, data]);
    } catch (error) {
      console.error("Error adding product:", error);
      throw error;
    }
  };

  const editProduct = async (id: string, product: Partial<Product>) => {
    try {
      const { error } = await supabase.from("products").update(product).eq("id", id);

      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...product } : p)));
    } catch (error) {
      console.error("Error editing product:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  };

  return {
    products,
    isLoading,
    addProduct,
    editProduct,
    deleteProduct,
  };
}
