import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Supplier {
  id: string;
  name: string;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSupplier = async (name: string) => {
    try {
      const { data, error } = await supabase.from("suppliers").insert({ name }).select().single();

      if (error) throw error;
      setSuppliers((prev) => [...prev, data]);
    } catch (error) {
      console.error("Error adding supplier:", error);
      throw error;
    }
  };

  const editSupplier = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("suppliers").update({ name }).eq("id", id);

      if (error) throw error;
      setSuppliers((prev) => prev.map((supplier) => (supplier.id === id ? { ...supplier, name } : supplier)));
    } catch (error) {
      console.error("Error editing supplier:", error);
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);

      if (error) throw error;
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
    } catch (error) {
      console.error("Error deleting supplier:", error);
      throw error;
    }
  };

  return {
    suppliers,
    isLoading,
    addSupplier,
    editSupplier,
    deleteSupplier,
  };
}
