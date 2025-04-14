"use client";

import { useState } from "react";

interface Product {
  id: string;
  name: string;
  stock: number;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "김치왕만두", stock: 100 },
    { id: "2", name: "매콤왕만두", stock: 80 },
    { id: "3", name: "갈비왕만두", stock: 60 },
  ]);

  const handleRelease = (productId: string) => {
    setProducts(
      products.map((product) => {
        if (product.id === productId && product.stock > 0) {
          return { ...product, stock: product.stock - 1 };
        }
        return product;
      })
    );
  };

  return (
    <div className="px-4">
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div>
              <h2 className="font-medium text-gray-900">{product.name}</h2>
              <span
                className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full
                  ${
                    product.stock > 50
                      ? "bg-green-100 text-green-800"
                      : product.stock > 20
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
              >
                재고: {product.stock}
              </span>
            </div>
            <button
              onClick={() => handleRelease(product.id)}
              disabled={product.stock <= 0}
              className={`ml-4 px-3 py-2 rounded-md text-sm font-medium
                ${product.stock > 0 ? "bg-blue-500 text-white active:bg-blue-600" : "bg-gray-100 text-gray-400"}`}
            >
              출고
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
