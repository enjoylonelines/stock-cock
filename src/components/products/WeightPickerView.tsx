"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface WeightPickerViewProps {
  currentWeight: number;
  currentWeightUnit?: "g" | "kg";
  onSelect: (weightInGrams: number, unit: "g" | "kg") => void;
  onClose: () => void;
}

/**
 * 중량 선택 컴포넌트
 */
export const WeightPickerView = ({ currentWeight, currentWeightUnit, onSelect, onClose }: WeightPickerViewProps) => {
  // 현재 중량을 kg/g로 변환
  const getDisplayWeight = useCallback((weightInGrams: number, preferredUnit?: "g" | "kg") => {
    // 선호하는 단위가 있으면 그것을 사용
    if (preferredUnit === "kg") {
      const kgValue = weightInGrams / 1000;
      const formattedValue = kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString();
      return { value: formattedValue, unit: "kg" as const };
    }
    if (preferredUnit === "g") {
      return { value: weightInGrams.toString(), unit: "g" as const };
    }

    // 선호하는 단위가 없으면 기본 규칙: 1000g 이상이면 kg로 표시
    if (weightInGrams >= 1000) {
      const kgValue = weightInGrams / 1000;
      const formattedValue = kgValue % 1 === 0 ? kgValue.toString() : Number.parseFloat(kgValue.toFixed(2)).toString();
      return { value: formattedValue, unit: "kg" as const };
    }
    return { value: weightInGrams.toString(), unit: "g" as const };
  }, []);

  const displayWeight = getDisplayWeight(currentWeight, currentWeightUnit);
  const [selectedValue, setSelectedValue] = useState<string>(displayWeight.value);
  const [selectedUnit, setSelectedUnit] = useState<"g" | "kg">(displayWeight.unit);

  // currentWeight나 currentWeightUnit이 변경되면 상태 업데이트
  useEffect(() => {
    const newDisplayWeight = getDisplayWeight(currentWeight, currentWeightUnit);
    setSelectedValue(newDisplayWeight.value);
    setSelectedUnit(newDisplayWeight.unit);
  }, [currentWeight, currentWeightUnit, getDisplayWeight]);

  // 단위 변경 핸들러
  const handleUnitChange = (newUnit: "g" | "kg") => {
    const oldUnit = selectedUnit;
    const currentNumValue = Number(selectedValue);

    if (!selectedValue || Number.isNaN(currentNumValue) || currentNumValue <= 0) {
      setSelectedUnit(newUnit);
      return;
    }

    // 단위 변경 시 값 조정
    if (oldUnit === "g" && newUnit === "kg") {
      // g -> kg: 1000으로 나누기 (소수점 보존)
      const newValue = currentNumValue / 1000;
      const formattedValue =
        newValue % 1 === 0 ? newValue.toString() : Number.parseFloat(newValue.toFixed(2)).toString();
      setSelectedValue(formattedValue);
    } else if (oldUnit === "kg" && newUnit === "g") {
      // kg -> g: 1000 곱하기 (정수로 변환)
      const newValue = Math.round(currentNumValue * 1000);
      setSelectedValue(newValue.toString());
    }

    setSelectedUnit(newUnit);
  };

  // 완료 버튼 클릭 시 그램으로 변환해서 전달
  const handleDone = () => {
    const numValue = Number(selectedValue);
    if (!selectedValue || Number.isNaN(numValue) || numValue <= 0) {
      alert("올바른 중량을 입력해주세요.");
      return;
    }

    // 최종 검증: 그램 단위로 변환한 값으로 검증
    const weightInGrams = selectedUnit === "kg" ? numValue * 1000 : numValue;
    const minGrams = 1;
    const maxGrams = 50000; // 50kg까지 허용

    if (weightInGrams < minGrams || weightInGrams > maxGrams) {
      alert(`중량은 ${minGrams}g부터 ${maxGrams}g(50kg)까지 입력 가능합니다.`);
      return;
    }

    onSelect(weightInGrams, selectedUnit);
  };

  // 숫자 포맷팅
  const formatDisplayValue = (value: string): string => {
    if (!value) return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    if (selectedUnit === "kg") {
      // 정수면 정수로, 소수면 최대 2자리까지 표시 (불필요한 0 제거)
      if (num % 1 === 0) {
        return `${num}kg`;
      }
      // 소수점이 있으면 최대 2자리까지 표시하되, 마지막 0은 제거
      return `${Number.parseFloat(num.toFixed(2))}kg`;
    }
    return `${num}g`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">중량 선택</h2>
      </div>
      <div className="flex flex-col flex-1 gap-6 justify-center px-6 py-8">
        {/* 중량 입력 및 단위 선택 */}
        <div className="flex gap-4 justify-center items-center">
          {/* 중량 입력 필드 */}
          <div className="flex-1 max-w-xs">
            <input
              type="number"
              value={selectedValue}
              onChange={e => {
                const value = e.target.value;
                // 숫자만 입력 가능
                if (value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0)) {
                  setSelectedValue(value);
                }
              }}
              placeholder={selectedUnit === "kg" ? "0.1" : "1"}
              step={selectedUnit === "kg" ? "0.01" : "1"}
              min={selectedUnit === "kg" ? "0.1" : "1"}
              max={selectedUnit === "kg" ? "50" : "50000"}
              className="p-4 w-full text-2xl text-center rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          {/* 단위 선택 버튼 */}
          <div className="flex gap-2">
            <Button
              variant={selectedUnit === "g" ? "default" : "outline"}
              size="lg"
              onClick={() => handleUnitChange("g")}
              className={`min-w-[60px] h-12 text-lg font-semibold ${
                selectedUnit === "g"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              g
            </Button>
            <Button
              variant={selectedUnit === "kg" ? "default" : "outline"}
              size="lg"
              onClick={() => handleUnitChange("kg")}
              className={`min-w-[60px] h-12 text-lg font-semibold ${
                selectedUnit === "kg"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              kg
            </Button>
          </div>
        </div>

        {/* 선택된 값 미리보기 */}
        <div className="text-center">
          <p className="text-sm text-gray-500">선택된 중량</p>
          <p className="text-2xl font-bold text-orange-500">{formatDisplayValue(selectedValue) || "입력 필요"}</p>
          {selectedValue && !Number.isNaN(Number(selectedValue)) && (
            <p className="mt-1 text-xs text-gray-400">
              ({selectedUnit === "kg" ? Math.round(Number(selectedValue) * 1000) : selectedValue}g로 저장됨)
            </p>
          )}
        </div>

        {/* 완료 버튼 */}
        <Button
          onClick={handleDone}
          className="w-full h-12 text-lg font-semibold text-white bg-orange-500 hover:bg-orange-600"
        >
          완료
        </Button>
      </div>
    </div>
  );
};
