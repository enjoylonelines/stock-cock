"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import { useInventories } from "@/hooks/useInventories";

export default function ProductList() {
  const { products } = useProducts();
  const { inventories } = useInventories();

  const getTotalStock = (productId: string) =>
    inventories.filter((i) => i.product_id === productId).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col gap-2">
      {products.map((product) => (
        <Link key={product.id} href={`/products/${product.id}`}>
          <Card className="px-4 py-2 transition-colors bg-slate-50 hover:bg-slate-100">
            <CardContent className="p-0">
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0 overflow-hidden rounded-md w-14 h-14 bg-slate-200">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <div className="flex flex-wrap mt-1 text-xs text-gray-600">
                    <span>{formatNumber(product.sell_price)}원</span>
                    <span className="mx-1">·</span>
                    <span>{formatNumber(product.buy_price)}원</span>
                    <span className="mx-1">·</span>
                    <span>{product.category}</span>
                    <span className="mx-1">·</span>
                    <span>{product.brand}</span>
                  </div>
                </div>
                <div className="text-2xl font-semibold text-blue-600">{formatNumber(getTotalStock(product.id))}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
