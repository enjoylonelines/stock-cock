"use client";

import { Button } from "@/components/ui/button";
import type { ProductType } from "@/store/formStateStore";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { memo } from "react";

interface ProductTypeSelectViewProps {
  currentType: ProductType;
  onSelect: (type: ProductType) => void;
  onClose: () => void;
}

/**
 * 제품 유형 선택 컴포넌트
 */
export const ProductTypeSelectView = memo(function ProductTypeSelectView({
  currentType,
  onSelect,
  onClose,
}: ProductTypeSelectViewProps) {
  const productTypes: Array<{ value: ProductType; label: string }> = [
    { value: "company", label: "자사" },
    { value: "franchise", label: "가맹점" },
    { value: "pb", label: "PB제품" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">제품 유형 선택</h2>
      </div>
      <div className="flex flex-col flex-1 gap-2 px-4 py-4">
        {productTypes.map(type => (
          <Button
            key={type.value}
            variant={currentType === type.value ? "default" : "ghost"}
            className={`flex justify-start items-center py-3 w-full text-left ${
              currentType === type.value ? "bg-orange-500 text-white hover:bg-orange-600" : "hover:bg-gray-50"
            }`}
            onClick={() => {
              onSelect(type.value);
              onClose();
            }}
          >
            <span className="text-base font-medium">{type.label}</span>
            {currentType === type.value && <ChevronRight className="ml-auto w-5 h-5 text-white" />}
          </Button>
        ))}
      </div>
    </div>
  );
});
