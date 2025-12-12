"use client";

import BaseFilterDrawer from "@/components/ui/BaseFilterDrawer";
import { Button } from "@/components/ui/button";
import type { ProductFilterState } from "@/store/productFilterDrawer";
import { useState } from "react";

interface ProductFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: ProductFilterState) => void;
  initialFilters?: ProductFilterState;
}

export default function ProductFilterDrawer({
  isOpen,
  onClose,
  onApplyFilter,
  initialFilters,
}: ProductFilterDrawerProps) {
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters || {});

  const handleReset = () => {
    setFilters({});
  };

  const handleApplyFilter = () => {
    onApplyFilter(filters);
    onClose();
  };

  return (
    <BaseFilterDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApplyFilter={handleApplyFilter}
      onReset={handleReset}
      title="제품 필터"
      description="제품 목록을 필터링합니다."
    >
      {/* 검색 */}
      <div className="space-y-3">
        <h3 className="font-medium">검색</h3>
        <input
          type="text"
          placeholder="제품명으로 검색..."
          className="p-3 w-full rounded-lg border"
          value={filters.searchQuery || ""}
          onChange={e => setFilters({ ...filters, searchQuery: e.target.value })}
        />
      </div>

      {/* 재고 여부 */}
      <div className="space-y-3">
        <h3 className="font-medium">재고 상태</h3>
        <div className="flex gap-2">
          <Button
            variant={filters.inStock === true ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, inStock: filters.inStock === true ? undefined : true })}
            className={filters.inStock === true ? "bg-blue-500 text-white" : ""}
          >
            재고 있음
          </Button>
          <Button
            variant={filters.inStock === false ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ ...filters, inStock: filters.inStock === false ? undefined : false })}
            className={filters.inStock === false ? "bg-blue-500 text-white" : ""}
          >
            재고 없음
          </Button>
        </div>
      </div>

      {/* TODO: 카테고리, 브랜드, 가격 범위 등 추가 필터 옵션들 */}
    </BaseFilterDrawer>
  );
}
