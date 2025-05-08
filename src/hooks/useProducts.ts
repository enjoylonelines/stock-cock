import { useState, useEffect } from "react";
import { Product } from "@/types/product";

const STORAGE_KEY = "products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      // 초기 데이터 설정
      const initialProducts = [
        {
          id: "1",
          name: "고기왕만두",
          sellPrice: 29900,
          buyPrice: 20000,
          category: "만두",
          brand: "더바른한끼",
          stock: 1000,
          imageUrl: "/images/product-1.jpg",
        },
        {
          id: "2",
          name: "김치왕만두",
          sellPrice: 13900,
          buyPrice: 15900,
          category: "만두",
          brand: "더바른한끼",
          stock: 500,
          imageUrl: "/images/product-2.jpg",
        },
      ];
      setProducts(initialProducts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
    }
  }, []);

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct = {
      ...product,
      id: Date.now().toString(),
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  };

  const editProduct = (id: string, product: Partial<Product>) => {
    const updatedProducts = products.map((p) => (p.id === id ? { ...p, ...product } : p));
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  };

  const deleteProduct = (id: string) => {
    const updatedProducts = products.filter((product) => product.id !== id);
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  };

  return {
    products,
    addProduct,
    editProduct,
    deleteProduct,
  };
}
