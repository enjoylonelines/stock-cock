"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { memo } from "react";

interface ProductFormFieldProps {
  label: string;
  value: string | number;
  placeholder?: string;
  onClick: () => void;
  suffix?: string;
}

/**
 * 제품 등록 폼 필드 컴포넌트
 */
export const ProductFormField = memo(function ProductFormField({
  label,
  value,
  placeholder = "선택",
  onClick,
  suffix,
}: ProductFormFieldProps) {
  return (
    <Button onClick={onClick} variant="ghost" className="flex justify-between items-center py-2 w-full" size="none">
      <div className="flex justify-between w-full">
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-gray-500">
          {value || placeholder}
          {suffix && value && ` ${suffix}`}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Button>
  );
});
