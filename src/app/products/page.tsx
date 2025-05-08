"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import ProductList from "@/components/products/ProductList";

export default function ProductsPage() {
  return (
    <div className="container max-w-3xl p-4 mx-auto space-y-4">
      {/* 검색 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
            <Input type="search" placeholder="제품 이름, 바코드, 속성 검색" className="h-12 bg-white pl-9" />
          </div>
        </div>
        {/* <div className="flex gap-2 ml-2">
          <Button variant="outline" size="icon" className="w-12 h-12">
            <Filter className="" />
          </Button>
          <Button variant="outline" size="icon" className="w-12 h-12">
            <ArrowDownUp className="text-lg" />
          </Button>
        </div> */}
      </div>

      {/* 제품 리스트 */}
      <ProductList />

      {/* 플로팅 액션 버튼 */}
      <div className="fixed bottom-20 right-4">
        <Button size="icon" className="rounded-full shadow-lg h-14 w-14">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
