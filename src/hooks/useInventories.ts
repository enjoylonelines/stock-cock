import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type Inventory = {
  id: string;
  option_id: string;
  location_id: string;
  total_stock: number;
  created_at: string;
  updated_at: string;
};

export function useInventories() {
  const [inventories, setInventories] = useState<Inventory[]>([]);

  useEffect(() => {
    const fetchInventories = async () => {
      const { data, error } = await supabase.from("inventory").select("*");
      if (!error && data) {
        setInventories(data as Inventory[]);
      }
    };
    fetchInventories();
  }, []);

  return { inventories };
}
