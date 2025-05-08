import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  name: string;
}

const STORAGE_KEY = "suppliers";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    const storedSuppliers = localStorage.getItem(STORAGE_KEY);
    if (storedSuppliers) {
      setSuppliers(JSON.parse(storedSuppliers));
    } else {
      // 초기 데이터 설정
      const initialSuppliers = [
        { id: "1", name: "A 공급처" },
        { id: "2", name: "B 공급처" },
        { id: "3", name: "C 공급처" },
      ];
      setSuppliers(initialSuppliers);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSuppliers));
    }
  }, []);

  const addSupplier = (name: string) => {
    const newSupplier = {
      id: Date.now().toString(),
      name,
    };
    const updatedSuppliers = [...suppliers, newSupplier];
    setSuppliers(updatedSuppliers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSuppliers));
  };

  const editSupplier = (id: string, name: string) => {
    const updatedSuppliers = suppliers.map((supplier) => (supplier.id === id ? { ...supplier, name } : supplier));
    setSuppliers(updatedSuppliers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSuppliers));
  };

  const deleteSupplier = (id: string) => {
    const updatedSuppliers = suppliers.filter((supplier) => supplier.id !== id);
    setSuppliers(updatedSuppliers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSuppliers));
  };

  return {
    suppliers,
    addSupplier,
    editSupplier,
    deleteSupplier,
  };
}
