"use client";

import Tab from "@/components/products/Tab";
import ProductList from "@/components/products/ProductList";
import ProductListSkeleton from "@/components/products/ProductListSkeleton";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type ProductType = "all" | "company" | "franchise" | "pb";

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  const { filters, setFilters } = useProductFilterDrawerStore();
  const [searchInput, setSearchInput] = useState(filters.searchQuery || "");
  const [selectedTab, setSelectedTab] = useState<ProductType>("company");

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

  // 탭별 제품 필터링
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedTab === "all") {
        return true;
      }
      return product.product_type === selectedTab;
    });
  }, [products, selectedTab]);

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
        onValueChange={(value) => setSelectedTab(value as ProductType)}
        size="md"
      />

      {/* 제품 리스트 */}
      {isLoading ? <ProductListSkeleton /> : <ProductList products={filteredProducts} />}
    </div>
  );
}
