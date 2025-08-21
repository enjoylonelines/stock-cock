"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import ProductList from "@/components/products/ProductList";
import { useProducts } from "@/hooks/useProducts";
import { ProductOptionView } from "@/types/product_option_view";

export default function ProductsPage() {
  const { products } = useProducts();

  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      {/* 검색 헤더 */}
      <div className="flex relative items-center w-full">
        <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-500 -translate-y-1/2" />
        <Input type="search" placeholder="제품 이름, 바코드, 속성 검색" className="pl-9 h-12 bg-white" />
      </div>

      {/* 제품 리스트 */}
      <ProductList products={products} />

      {/* 플로팅 액션 버튼 */}
      <div className="fixed right-4 bottom-24">
        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
