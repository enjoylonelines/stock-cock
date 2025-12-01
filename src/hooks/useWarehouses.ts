import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase";
import { Warehouse } from "@/types/database";

const fetcher = async () => {
  const { data, error } = await supabase.from("warehouses").select("*").order("name");
  if (error) throw error;
  return (data || []) as Warehouse[];
};

export function useLocations() {
  const { data: locations = [], isLoading } = useSWR<Warehouse[]>("warehouses", fetcher, {
    revalidateOnFocus: false,
  });

  const addLocation = async (name: string) => {
    const { data, error } = await supabase.from("warehouses").insert({ name }).select().single();
    if (error) throw error;
    await mutate("warehouses", (current: Warehouse[] = []) => [...current, data], false);
    return data;
  };

  const editLocation = async (id: string, name: string) => {
    const { error } = await supabase.from("warehouses").update({ name }).eq("id", id);
    if (error) throw error;
    await mutate("warehouses", (current: Warehouse[] = []) => current.map((location) => (location.id === id ? { ...location, name } : location)), false);
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw error;
    await mutate("warehouses", (current: Warehouse[] = []) => current.filter((location) => location.id !== id), false);
  };

  return {
    locations,
    isLoading,
    addLocation,
    editLocation,
    deleteLocation,
  };
}
