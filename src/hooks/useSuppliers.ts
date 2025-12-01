import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";

interface Supplier {
  id: string;
  name: string;
}

const fetcher = async () => {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return (data || []) as Supplier[];
};

export function useSuppliers() {
  const { data: suppliers = [], isLoading } = useSWR<Supplier[]>("suppliers", fetcher, {
    revalidateOnFocus: false,
  });

  const addSupplier = async (name: string) => {
    const { data, error } = await supabase.from("suppliers").insert({ name }).select().single();
    if (error) throw error;
    await mutate("suppliers", (current: Supplier[] = []) => [...current, data], false);
    return data;
  };

  const editSupplier = async (id: string, name: string) => {
    const { error } = await supabase.from("suppliers").update({ name }).eq("id", id);
    if (error) throw error;
    await mutate("suppliers", (current: Supplier[] = []) => current.map((supplier) => (supplier.id === id ? { ...supplier, name } : supplier)), false);
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;
    await mutate("suppliers", (current: Supplier[] = []) => current.filter((supplier) => supplier.id !== id), false);
  };

  return {
    suppliers,
    isLoading,
    addSupplier,
    editSupplier,
    deleteSupplier,
  };
}
