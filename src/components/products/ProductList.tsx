"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  unit: string;
  status: string;
  stock: number;
  imageUrl?: string;
}

export default function ProductList() {
  // 임시 데이터
  const products: Product[] = [
    {
      id: "1",
      name: "고기왕만두",
      price: 29900,
      costPrice: 20000,
      unit: "만두",
      status: "더바른한끼",
      stock: 1000,
      imageUrl: "/images/product-1.jpg",
    },
    {
      id: "2",
      name: "김치왕만두",
      price: 13900,
      costPrice: 15900,
      unit: "만두",
      status: "더바른한끼",
      stock: 500,
    },
  ];

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <Card key={product.id} className="p-4 bg-slate-50">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0 overflow-hidden rounded-md w-14 h-14 bg-slate-200">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{product.name}</h3>
                <div className="flex flex-wrap mt-1 text-sm text-gray-600 ">
                  <span>{product.price.toLocaleString()} |&nbsp;</span>
                  <span> {product.costPrice.toLocaleString()} |&nbsp;</span>
                  <span>{product.unit} |&nbsp;</span>
                  <span>{product.status} |&nbsp;</span>
                  <span>{product.stock.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-2xl font-semibold text-blue-600">1</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
