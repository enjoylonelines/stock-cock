import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Brand {
  id: string;
  name: string;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addBrand = async (name: string) => {
    try {
      const { data, error } = await supabase.from("brands").insert({ name }).select().single();
      if (error) throw error;
      setBrands((prev) => [...prev, data]);
    } catch (error) {
      console.error("Error adding brand:", error);
      throw error;
    }
  };

  const editBrand = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("brands").update({ name }).eq("id", id);
      if (error) throw error;
      setBrands((prev) => prev.map((brand) => (brand.id === id ? { ...brand, name } : brand)));
    } catch (error) {
      console.error("Error editing brand:", error);
      throw error;
    }
  };

  const deleteBrand = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      setBrands((prev) => prev.filter((brand) => brand.id !== id));
    } catch (error) {
      console.error("Error deleting brand:", error);
      throw error;
    }
  };

  return {
    brands,
    isLoading,
    addBrand,
    editBrand,
    deleteBrand,
  };
}
