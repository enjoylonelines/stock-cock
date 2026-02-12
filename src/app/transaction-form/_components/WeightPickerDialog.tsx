"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatWeight } from "@/lib/domain/format";
import type { DomainStockItem } from "@/types/domain";
import { useEffect, useState } from "react";

type FormType = "in" | "adjust";

interface WeightPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DomainStockItem | null;
  onConfirm: (product: DomainStockItem, weightInGrams: number) => void;
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

  // 다이얼로그 열릴 때 초기화: 조정은 현재 재고로, 입고는 0(빈값)으로
  useEffect(() => {
    if (open) {
      if (formType === "adjust") {
        if (currentStock >= 1000) {
          const kgValue = currentStock / 1000;
          setInputValue(kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString());
          setSelectedUnit("kg");
        } else {
          setInputValue(currentStock.toString());
          setSelectedUnit("g");
        }
      } else {
        // 입고: 0으로 초기화 (빈 입력)
        setInputValue("");
        setSelectedUnit("kg");
      }
    }
  }, [open, currentStock, formType]);

  const [unitCount, setUnitCount] = useState(1);

  useEffect(() => {
    if (open) setUnitCount(1);
  }, [open]);

  // 현재 입력값을 그램 단위로 반환
  const getCurrentGrams = (): number => {
    const num = Number(inputValue);
    if (inputValue === "" || Number.isNaN(num) || num < 0) return 0;
    return selectedUnit === "kg" ? Math.round(num * 1000) : Math.round(num);
  };

  // 그램만큼 더하기 (규격 추가 버튼용)
  const addWeightGrams = (grams: number) => {
    const current = getCurrentGrams();
    const next = current + grams;
    if (next >= 1000) {
      const kgValue = next / 1000;
      setInputValue(kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString());
      setSelectedUnit("kg");
    } else {
      setInputValue(next.toString());
      setSelectedUnit("g");
    }
  };

  // 제품 규격 1단위 중량 (그램)
  const productWeightGrams = product ? Math.round(product.weight) : 0;

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

    // 조정 모드에서는 0 허용, 입고 모드에서는 0보다 커야 함
    const isInvalidValue =
      formType === "adjust" ? Number.isNaN(numValue) || numValue < 0 : !inputValue || Number.isNaN(numValue) || numValue <= 0;

    if (isInvalidValue) {
      alert("올바른 중량을 입력해주세요.");
      return;
    }

    // 그램으로 변환
    const weightInGrams = selectedUnit === "kg" ? Math.round(numValue * 1000) : numValue;

    // 유효성 검사 (조정 모드에서는 0 허용)
    const maxGrams = 10000000000; // 10000000kg까지 허용
    if (weightInGrams < 0 || weightInGrams > maxGrams) {
      alert(`중량은 0g부터 ${maxGrams}kg까지 입력 가능합니다.`);
      return;
    }

    // 입고 모드에서는 0보다 커야 함
    if (formType === "in" && weightInGrams < 1) {
      alert("입고할 중량은 1g 이상이어야 합니다.");
      return;
    }

    onConfirm(product, weightInGrams);
    onOpenChange(false);
  };

  // 표시용 값 포맷팅 (1kg 미만은 g, 이상은 kg - 도메인 formatWeight)
  const formatDisplayValue = (): string => {
    if (!inputValue) return "";
    const num = Number(inputValue);
    if (Number.isNaN(num)) return "";
    const grams = selectedUnit === "kg" ? Math.round(num * 1000) : Math.round(num);
    return formatWeight(grams);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-full max-w-xs bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>{FORM_TYPE_TITLES[formType]}</DialogTitle>
          <p className="text-sm text-gray-500">{product.name}</p>
        </DialogHeader>

        <div className="p-4">
          {/* 중량 입력 영역 */}
          <div className="flex flex-col gap-4 p-4 mb-4 bg-gray-50 rounded-lg">
            {/* 입력 필드와 단위 선택 */}
            <div className="flex gap-3 justify-center items-center">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0)) {
                    setInputValue(value);
                  }
                }}
                placeholder={selectedUnit === "kg" ? "0.00" : "0"}
                step={selectedUnit === "kg" ? "0.01" : "1"}
                min="0"
                className="p-2 w-24 text-2xl font-semibold text-center bg-white rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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

            {/* N규격 추가 (규격이 있을 때만) */}
            {productWeightGrams > 0 && (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  value={unitCount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) setUnitCount(Math.max(1, Math.floor(v)));
                  }}
                  className="py-2 w-14 text-base font-medium text-center rounded-md border focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 shrink-0"
                  onClick={() => addWeightGrams(unitCount * productWeightGrams)}
                >
                  +{unitCount}규격 ({formatWeight(unitCount * productWeightGrams)}) 추가
                </Button>
              </div>
            )}

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
