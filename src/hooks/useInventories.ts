import { createClient } from "@/lib/supabase/client";
import type { Inventory } from "@/types/database";
import useSWR from "swr";

const supabase = createClient();

const fetcher = async () => {
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) throw error;
  return (data || []) as Inventory[];
};

export function useInventories() {
  const { data: inventories = [], mutate } = useSWR<Inventory[]>("inventories", fetcher, {
    revalidateOnFocus: false,
  });

  return { inventories, mutate };
}
