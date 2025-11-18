"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ProductFilterState } from "@/store/productFilterDrawer";

interface ProductFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: ProductFilterState) => void;
  initialFilters?: ProductFilterState;
}

export default function ProductFilterDrawer({ isOpen, onClose, onApplyFilter, initialFilters }: ProductFilterDrawerProps) {
  const [filters, setFilters] = useState<ProductFilterState>(initialFilters || {});

  const handleReset = () => {
    setFilters({});
  };

  const handleApplyFilter = () => {
    onApplyFilter(filters);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90vh] flex flex-col max-w-3xl mx-auto" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={onClose} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex justify-between items-center py-2 border-b-2 border-blue-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-blue-400">제품 필터</DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">제품 목록을 필터링합니다.</DrawerDescription>
            </div>
            <Button variant="ghost" onClick={handleReset}>
              초기화
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* 검색 */}
          <div className="space-y-3">
            <h3 className="font-medium">검색</h3>
            <input
              type="text"
              placeholder="제품명으로 검색..."
              className="p-3 w-full rounded-lg border"
              value={filters.searchQuery || ""}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
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
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t">
          <Button className="w-full h-12 text-lg font-semibold text-white bg-blue-500 hover:bg-blue-600" onClick={handleApplyFilter}>
            필터 적용
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
