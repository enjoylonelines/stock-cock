import { useState, useEffect } from "react";

interface Location {
  id: string;
  name: string;
}

const STORAGE_KEY = "locations";

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    const storedLocations = localStorage.getItem(STORAGE_KEY);
    if (storedLocations) {
      setLocations(JSON.parse(storedLocations));
    } else {
      // 초기 데이터 설정
      const initialLocations = [
        { id: "1", name: "A 창고" },
        { id: "2", name: "B 창고" },
        { id: "3", name: "C 창고" },
      ];
      setLocations(initialLocations);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLocations));
    }
  }, []);

  const addLocation = (name: string) => {
    const newLocation = {
      id: Date.now().toString(),
      name,
    };
    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocations));
  };

  const editLocation = (id: string, name: string) => {
    const updatedLocations = locations.map((location) => (location.id === id ? { ...location, name } : location));
    setLocations(updatedLocations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocations));
  };

  const deleteLocation = (id: string) => {
    const updatedLocations = locations.filter((location) => location.id !== id);
    setLocations(updatedLocations);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocations));
  };

  return {
    locations,
    addLocation,
    editLocation,
    deleteLocation,
  };
}
