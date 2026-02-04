"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useProductList } from "./_hooks/useProductList";
import Tab from "./_components/Tab";
import ProductListSkeleton from "./_components/ProductListSkeleton";
import ProductList from "./_components/ProductList";

/**
 * 제품 목록 페이지 컴포넌트 (순수 UI)
 */
export default function ProductsPage() {
  const { isLoading, searchInput, selectedTab, filteredProducts, handleSearchChange, handleTabChange } = useProductList();

  const tabItems = [
    {
      value: "company",
      label: "자사",
    },
    {
      value: "franchise",
      label: "가맹점",
    },
    {
      value: "pb",
      label: "PB제품",
    },
    {
      value: "material",
      label: "원재료",
    },
    {
      value: "all",
      label: "전체",
    },
  ];

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

      {/* 탭 */}
      <Tab
        items={tabItems}
        defaultValue="company"
        value={selectedTab}
        onValueChange={(value) => handleTabChange(value as typeof selectedTab)}
        size="md"
      />

      {/* 제품 리스트 */}
      {isLoading ? <ProductListSkeleton /> : <ProductList products={filteredProducts} />}
    </div>
  );
}
