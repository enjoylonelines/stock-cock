import { supabase } from "@/lib/supabase";
import type { Inventory } from "@/types/database";
import useSWR from "swr";

const fetcher = async () => {
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) throw error;
  return (data || []) as Inventory[];
};

export function useInventories() {
  const { data: inventories = [] } = useSWR<Inventory[]>("inventories", fetcher, {
    revalidateOnFocus: false,
  });

  return { inventories };
}
