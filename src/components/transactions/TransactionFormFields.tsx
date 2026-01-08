"use client";

import { Button } from "@/components/ui/button";
import type { ProductOptionView } from "@/types/product_option_view";
import { ChevronRight } from "lucide-react";
import { memo } from "react";
import ProductListItem from "./ProductListItem";

interface TransactionFormFieldsProps {
  formattedDate: string;
  selectedWarehouseName: string;
  selectedSupplierName: string;
  selectedProducts: ProductOptionView[];
  memo: string;
  mode: "in" | "out";
  onDateClick: () => void;
  onWarehouseClick: () => void;
  onSupplierClick: () => void;
  onProductClick: () => void;
  onMemoClick: () => void;
}

/**
 * 입고/출고 폼 필드 컴포넌트
 */
export const TransactionFormFields = memo(function TransactionFormFields({
  formattedDate,
  selectedWarehouseName,
  selectedSupplierName,
  selectedProducts,
  memo,
  mode,
  onDateClick,
  onWarehouseClick,
  onSupplierClick,
  onProductClick,
  onMemoClick,
}: TransactionFormFieldsProps) {
  return (
    <div className="space-y-2">
      <Button
        onClick={onDateClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">날짜</h3>
          <p className="text-sm text-gray-500">{formattedDate}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>

      <Button
        onClick={onWarehouseClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">위치</h3>
          <p className="text-sm text-gray-500">{selectedWarehouseName}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>

      <Button
        onClick={onSupplierClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">거래처</h3>
          <p className="text-sm text-gray-500">{selectedSupplierName}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>

      <Button
        onClick={onProductClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">제품</h3>
          <p className="text-sm text-gray-500">{selectedProducts.length}개 품목</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>

      {/* 선택된 제품 리스트 */}
      {selectedProducts.length > 0 && (
        <div className="mt-2 space-y-2">
          {selectedProducts.map(product => (
            <ProductListItem
              key={product.product_option_id}
              product={product}
              quantity={product.quantity}
              selected={false}
            />
          ))}
        </div>
      )}

      <Button
        onClick={onMemoClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">메모</h3>
          <p className="text-sm text-gray-500">{memo || "작성"}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>
    </div>
  );
});
