"use client";

import { Button } from "@/components/ui/button";
import { formatWeightDisplay } from "@/lib/utils";
import type { ProductType } from "@/store/formStateStore";
import { ChevronRight } from "lucide-react";
import { memo } from "react";

interface ProductFormFieldsProps {
  sku: string;
  name: string;
  initQuantity: string;
  boxUnit: string;
  categoryId: string;
  brandId: string;
  productType: ProductType;
  weight: number;
  weightUnit: "g" | "kg";
  initLocation: string;
  storageType?: string;
  origin?: string;
  mode: "create" | "edit";
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  onNameChange: (value: string) => void;
  onInitQuantityChange: (value: string) => void;
  onBoxUnitChange: (value: string) => void;
  onStorageTypeChange: (value: string) => void;
  onOriginChange: (value: string) => void;
  onCategoryClick: () => void;
  onBrandClick: () => void;
  onProductTypeClick: () => void;
  onWeightClick: () => void;
  onLocationClick: () => void;
}

/**
 * 제품 등록 폼 필드 컴포넌트
 */
export const ProductFormFields = memo(function ProductFormFields({
  sku,
  name,
  initQuantity,
  boxUnit,
  categoryId,
  brandId,
  productType,
  weight,
  weightUnit,
  initLocation,
  storageType,
  origin,
  mode,
  categories,
  brands,
  warehouses,
  onNameChange,
  onInitQuantityChange,
  onBoxUnitChange,
  onStorageTypeChange,
  onOriginChange,
  onCategoryClick,
  onBrandClick,
  onProductTypeClick,
  onWeightClick,
  onLocationClick,
}: ProductFormFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center py-2 w-full">
        <h3 className="font-medium">SKU:</h3>
        <p className="text-sm text-gray-400">{sku ? sku : "-"}</p>
      </div>
      <div className="flex gap-2 items-center py-2 w-full">
        <h3 className="w-20 font-medium">제품명</h3>
        <input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="제품명 입력"
          className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      {mode === "create" && (
        <div className="flex gap-2 items-center py-2 w-full">
          <h3 className="w-20 font-medium">초기수량</h3>
          <input
            value={initQuantity}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              onInitQuantityChange(val);
            }}
            placeholder="초기 수량 입력"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      )}
      <div className="flex gap-2 items-center py-2 w-full">
        <h3 className="w-20 font-medium">박스 단위</h3>
        <input
          value={boxUnit}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, "");
            onBoxUnitChange(val);
          }}
          placeholder="박스 1개당 수량"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      <p className="text-xs text-gray-500">예: 박스당 12개면 12를 입력하세요.</p>
      <Button
        onClick={onCategoryClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">카테고리</h3>
          <p className="text-sm text-gray-500">{categories.find(c => c.id === categoryId)?.name || "카테고리 선택"}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>
      <Button
        onClick={onBrandClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">브랜드</h3>
          <p className="text-sm text-gray-500">{brands.find(b => b.id === brandId)?.name || "브랜드 선택"}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>
      <Button
        onClick={onProductTypeClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">제품 유형</h3>
          <p className="text-sm text-gray-500">
            {productType === "company"
              ? "자사"
              : productType === "franchise"
                ? "가맹점"
                : productType === "pb"
                  ? "PB제품"
                  : productType === "material"
                    ? "원재료"
                    : "제품 유형 선택"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>
      {/* 원재료일 때만 보관방식과 원산지 필드 표시 */}
      {productType === "material" && (
        <>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">보관방식</h3>
            <select
              value={storageType || ""}
              onChange={e => onStorageTypeChange(e.target.value)}
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">선택</option>
              <option value="실온">실온</option>
              <option value="냉장">냉장</option>
              <option value="냉동">냉동</option>
            </select>
          </div>
          <div className="flex gap-2 items-center py-2 w-full">
            <h3 className="w-20 font-medium">원산지</h3>
            <input
              value={origin || ""}
              onChange={e => onOriginChange(e.target.value)}
              placeholder="원산지 입력"
              className="flex-1 p-2 text-base rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </>
      )}
      <Button
        onClick={onWeightClick}
        variant="ghost"
        className="flex justify-between items-center py-2 w-full"
        size="none"
      >
        <div className="flex justify-between w-full">
          <h3 className="font-medium">중량</h3>
          <p className="text-sm text-gray-500">{formatWeightDisplay(weight, weightUnit)}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Button>
      {mode === "create" && (
        <Button
          onClick={onLocationClick}
          variant="ghost"
          className="flex justify-between items-center py-2 w-full"
          size="none"
        >
          <div className="flex justify-between w-full">
            <h3 className="font-medium">위치</h3>
            <p className="text-sm text-gray-500">{warehouses.find(l => l.id === initLocation)?.name || "위치 선택"}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      )}
    </div>
  );
});
