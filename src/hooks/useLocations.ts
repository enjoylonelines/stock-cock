import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Location {
  id: string;
  name: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from("locations").select("*").order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addLocation = async (name: string) => {
    try {
      const { data, error } = await supabase.from("locations").insert({ name }).select().single();

      if (error) throw error;
      setLocations((prev) => [...prev, data]);
    } catch (error) {
      console.error("Error adding location:", error);
      throw error;
    }
  };

  const editLocation = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("locations").update({ name }).eq("id", id);

      if (error) throw error;
      setLocations((prev) => prev.map((location) => (location.id === id ? { ...location, name } : location)));
    } catch (error) {
      console.error("Error editing location:", error);
      throw error;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase.from("locations").delete().eq("id", id);

      if (error) throw error;
      setLocations((prev) => prev.filter((location) => location.id !== id));
    } catch (error) {
      console.error("Error deleting location:", error);
      throw error;
    }
  };

  return {
    locations,
    isLoading,
    addLocation,
    editLocation,
    deleteLocation,
  };
}
