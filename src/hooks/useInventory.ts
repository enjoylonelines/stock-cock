import { useState } from "react";

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  maxStock: number;
}

export function useInventory(product: Product) {
  const [stock, setStock] = useState(product.stock);

  const isLowStock = stock < product.minStock;

  const release = (quantity: number) => {
    if (quantity <= 0) return;

    const newStock = Math.max(0, stock - quantity);
    setStock(newStock);
  };

  const receive = (quantity: number) => {
    if (quantity <= 0) return;

    const newStock = Math.min(product.maxStock, stock + quantity);
    setStock(newStock);
  };

  return {
    stock,
    isLowStock,
    release,
    receive,
  };
}
