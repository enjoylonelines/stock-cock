import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Inventory } from "@/types/database";

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
