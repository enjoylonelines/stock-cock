"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProductOptionView } from "@/types/database";
import { useCallback, useEffect, useState } from "react";

type FormType = "in" | "adjust";

interface WeightPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductOptionView | null;
  onConfirm: (product: ProductOptionView, weightInGrams: number) => void;
  formType?: FormType;
  currentStock?: number; // 현재 재고 (g 단위)
}

const FORM_TYPE_TITLES: Record<FormType, string> = {
  in: "입고할 중량을 입력하세요",
  adjust: "조정할 중량을 입력하세요",
};

/**
 * 원재료 중량 선택 다이얼로그
 */
export default function WeightPickerDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  formType = "in",
  currentStock = 0,
}: WeightPickerDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<"g" | "kg">("kg");

  // 현재 재고를 kg/g로 변환하여 표시
  const formatWeight = useCallback((weightInGrams: number) => {
    if (weightInGrams >= 1000) {
      const kgValue = weightInGrams / 1000;
      return kgValue % 1 === 0 ? `${kgValue}kg` : `${Number.parseFloat(kgValue.toFixed(2))}kg`;
    }
    return `${weightInGrams}g`;
  }, []);

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open) {
      // 조정의 경우 현재 재고를 기본값으로
      if (formType === "adjust" && currentStock > 0) {
        if (currentStock >= 1000) {
          const kgValue = currentStock / 1000;
          setInputValue(kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString());
          setSelectedUnit("kg");
        } else {
          setInputValue(currentStock.toString());
          setSelectedUnit("g");
        }
      } else {
        setInputValue("");
        setSelectedUnit("kg");
      }
    }
  }, [open, formType, currentStock]);

  // 단위 변경 핸들러
  const handleUnitChange = (newUnit: "g" | "kg") => {
    const oldUnit = selectedUnit;
    const currentNumValue = Number(inputValue);

    if (!inputValue || Number.isNaN(currentNumValue) || currentNumValue <= 0) {
      setSelectedUnit(newUnit);
      return;
    }

    // 단위 변경 시 값 조정
    if (oldUnit === "g" && newUnit === "kg") {
      const newValue = currentNumValue / 1000;
      const formattedValue = newValue % 1 === 0 ? newValue.toString() : Number.parseFloat(newValue.toFixed(2)).toString();
      setInputValue(formattedValue);
    } else if (oldUnit === "kg" && newUnit === "g") {
      const newValue = Math.round(currentNumValue * 1000);
      setInputValue(newValue.toString());
    }

    setSelectedUnit(newUnit);
  };

  // 완료 핸들러
  const handleConfirm = () => {
    if (!product) return;

    const numValue = Number(inputValue);
    if (!inputValue || Number.isNaN(numValue) || numValue <= 0) {
      alert("올바른 중량을 입력해주세요.");
      return;
    }

    // 그램으로 변환
    const weightInGrams = selectedUnit === "kg" ? Math.round(numValue * 1000) : numValue;

    // 유효성 검사
    const maxGrams = 1000000; // 1000kg까지 허용
    if (weightInGrams < 1 || weightInGrams > maxGrams) {
      alert(`중량은 1g부터 ${maxGrams / 1000}kg까지 입력 가능합니다.`);
      return;
    }

    onConfirm(product, weightInGrams);
    onOpenChange(false);
  };

  // 표시용 값 포맷팅
  const formatDisplayValue = (): string => {
    if (!inputValue) return "";
    const num = Number(inputValue);
    if (Number.isNaN(num)) return "";
    return selectedUnit === "kg" ? `${num}kg` : `${num}g`;
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-full max-w-xs bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>{FORM_TYPE_TITLES[formType]}</DialogTitle>
          <p className="text-sm text-gray-500">{product.product_name}</p>
        </DialogHeader>

        <div className="p-4">
          {/* 중량 입력 영역 */}
          <div className="flex flex-col gap-4 p-4 mb-4 bg-gray-50 rounded-lg">
            {/* 입력 필드와 단위 선택 */}
            <div className="flex gap-3 justify-center items-center">
              <input
                type="number"
                value={inputValue}
                onChange={e => {
                  const value = e.target.value;
                  if (value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0)) {
                    setInputValue(value);
                  }
                }}
                placeholder={selectedUnit === "kg" ? "0.00" : "0"}
                step={selectedUnit === "kg" ? "0.01" : "1"}
                min="0"
                className="w-24 text-2xl font-semibold text-center bg-white rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 p-2"
              />

              {/* 단위 선택 버튼 */}
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={selectedUnit === "g" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUnitChange("g")}
                  className={`min-w-[40px] h-10 text-sm font-semibold ${
                    selectedUnit === "g"
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  g
                </Button>
                <Button
                  type="button"
                  variant={selectedUnit === "kg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUnitChange("kg")}
                  className={`min-w-[40px] h-10 text-sm font-semibold ${
                    selectedUnit === "kg"
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  kg
                </Button>
              </div>
            </div>

            {/* 현재 재고 표시 */}
            <div className="text-sm text-center text-gray-500">
              {formType === "adjust" ? (
                <span>현재 재고: {formatWeight(currentStock)}</span>
              ) : (
                inputValue && <span>입고량: {formatDisplayValue()}</span>
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button className="text-white bg-orange-500 hover:bg-orange-600" onClick={handleConfirm}>
              적용
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
