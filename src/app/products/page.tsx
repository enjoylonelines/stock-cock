"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import ProductList from "@/components/products/ProductList";
import ProductListSkeleton from "@/components/products/ProductListSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { useState } from "react";

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  const { filters, setFilters } = useProductFilterDrawerStore();
  const [searchInput, setSearchInput] = useState(filters.searchQuery || "");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters({ ...filters, searchQuery: value });
  };

  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      {/* 검색 헤더 */}
      <div className="flex relative items-center w-full">
        <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-500 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="제품 이름, 바코드, 속성 검색"
          className="pl-9 h-12 bg-white"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* 제품 리스트 */}
      {isLoading ? <ProductListSkeleton /> : <ProductList products={products} />}

      {/* 플로팅 액션 버튼 */}
      {/* <div className="fixed right-4 bottom-24">
        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg">
          <Plus />
        </Button>
      </div> */}
    </div>
  );
}
