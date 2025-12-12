"use client";

import ProductList from "@/components/products/ProductList";
import ProductListSkeleton from "@/components/products/ProductListSkeleton";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  const { filters, setFilters } = useProductFilterDrawerStore();
  const [searchInput, setSearchInput] = useState(filters.searchQuery || "");

  // Debounce 검색 입력
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchQuery) {
        setFilters({ ...filters, searchQuery: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters, setFilters]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

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
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      {/* 제품 리스트 */}
      {isLoading ? <ProductListSkeleton /> : <ProductList products={products} />}
    </div>
  );
}
