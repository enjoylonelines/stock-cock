import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getBoxBreakdown(quantity?: number | null, boxUnit?: number | null) {
  if (typeof quantity !== "number" || quantity < 0) {
    return null;
  }

  const normalizedBoxUnit = typeof boxUnit === "number" && boxUnit > 1 ? Math.floor(boxUnit) : null;
  if (!normalizedBoxUnit) {
    return null;
  }

  return {
    boxes: Math.floor(quantity / normalizedBoxUnit),
    remainder: quantity % normalizedBoxUnit,
    boxUnit: normalizedBoxUnit,
  };
}

export function formatBoxBreakdown(quantity?: number | null, boxUnit?: number | null) {
  const breakdown = getBoxBreakdown(quantity, boxUnit);
  if (!breakdown) {
    return "";
  }

  const { boxes, remainder } = breakdown;
  const parts = [];

  if (boxes > 0) {
    parts.push(`${formatNumber(boxes)}박스`);
  }
  if (remainder > 0) {
    parts.push(`${formatNumber(remainder)}봉`);
  }

  if (parts.length === 0) {
    return "0박스";
  }

  return parts.join(" + ");
}

// 원재료 summary 포맷팅: 규격(weight) 단위로 나누어 "규격 × 개수 + 잔량" 표시
export function formatMaterialSummary(
  weightInGrams: number | null | undefined,
  optionWeight: number,
  unitLabel: string | null | undefined,
): string | null {
  const totalGrams = weightInGrams ?? 0;
  if (!optionWeight || !unitLabel || totalGrams === 0) {
    return null;
  }

  // 규격 weight를 기본 단위로 변환 (g 또는 ml)
  const normalizedUnit = unitLabel.toLowerCase();
  let optionWeightInBase: number;
  const isLiquid = normalizedUnit === "l" || normalizedUnit === "리터";

  if (normalizedUnit === "kg") {
    optionWeightInBase = optionWeight * 1000; // kg → g
  } else if (isLiquid) {
    optionWeightInBase = optionWeight * 1000; // L → ml
  } else {
    optionWeightInBase = optionWeight; // g 또는 기타 단위는 그대로
  }

  // 규격 표시용 (g 단위이고 1kg 미만이면 g 그대로, 아니면 kg)
  let displayOptionWeight: string;
  let displayUnit: string;

  if (isLiquid) {
    displayUnit = "L";
    displayOptionWeight = optionWeight % 1 === 0 ? optionWeight.toString() : optionWeight.toFixed(1);
  } else if (normalizedUnit === "g") {
    if (optionWeight < 1000) {
      // 1kg 미만: g 그대로 표시 (예: 300g)
      displayUnit = "g";
      displayOptionWeight = optionWeight % 1 === 0 ? optionWeight.toString() : optionWeight.toFixed(1);
    } else {
      // 1kg 이상: kg로 변환 (예: 1000g → 1kg)
      displayUnit = "kg";
      const kgValue = optionWeight / 1000;
      displayOptionWeight = kgValue % 1 === 0 ? kgValue.toString() : kgValue.toFixed(1);
    }
  } else {
    // kg 단위
    displayUnit = "kg";
    displayOptionWeight = optionWeight % 1 === 0 ? optionWeight.toString() : optionWeight.toFixed(1);
  }

  // 박스 개수와 나머지 계산
  const boxes = Math.floor(totalGrams / optionWeightInBase);
  const remainderBase = totalGrams % optionWeightInBase;

  const parts: string[] = [];

  if (boxes > 0) {
    parts.push(`${displayOptionWeight}${displayUnit} × ${formatNumber(boxes)}`);
  }

  if (remainderBase > 0) {
    // 나머지 표시 (액체는 L/ml, 고체는 kg/g)
    if (isLiquid) {
      if (remainderBase >= 1000) {
        const remainderL = remainderBase / 1000;
        const formattedRemainder = remainderL % 1 === 0 ? remainderL.toString() : remainderL.toFixed(2);
        parts.push(`${formattedRemainder}L`);
      } else {
        parts.push(`${remainderBase}ml`);
      }
    } else {
      if (remainderBase >= 1000) {
        const remainderKg = remainderBase / 1000;
        const formattedRemainder = remainderKg % 1 === 0 ? remainderKg.toString() : remainderKg.toFixed(2);
        parts.push(`${formattedRemainder}kg`);
      } else {
        parts.push(`${remainderBase}g`);
      }
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" + ");
}

// 중량을 읽기 쉽게 표시하는 함수 (그램 단위를 입력받아 g 또는 kg으로 표시)
export function formatWeightDisplay(weightInGrams: number | null | undefined, preferredUnit?: "g" | "kg"): string {
  if (!weightInGrams || weightInGrams <= 0) return "중량 선택";

  // 선호하는 단위가 있으면 그것을 사용
  if (preferredUnit === "kg") {
    const kgValue = weightInGrams / 1000;
    if (kgValue % 1 === 0) {
      return `${kgValue}kg`;
    }
    return `${Number.parseFloat(kgValue.toFixed(2))}kg`;
  }
  if (preferredUnit === "g") {
    return `${weightInGrams}g`;
  }

  // 선호하는 단위가 없으면 기본 규칙 사용: 1000g 이상이면 kg로 표시
  if (weightInGrams >= 1000) {
    const kgValue = weightInGrams / 1000;
    if (kgValue % 1 === 0) {
      return `${kgValue}kg`;
    }
    return `${Number.parseFloat(kgValue.toFixed(2))}kg`;
  }
  return `${weightInGrams}g`;
}

// SKU 생성 함수
function getInitials(str: string) {
  const CHO = [
    "G",
    "GG",
    "N",
    "D",
    "DD",
    "R",
    "M",
    "B",
    "BB",
    "S",
    "SS",
    "NG",
    "J",
    "JJ",
    "CH",
    "K",
    "T",
    "P",
    "H",
    "W",
    "WW",
    "A",
    "E",
    "I",
    "O",
    "U",
    "Y",
    "K",
    "M",
    "P",
    "S",
    "T",
    "W",
    "Y",
  ];
  let result = "";
  for (const char of str) {
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      result += CHO[Math.floor(code / 588)];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toUpperCase();
    }
    // 기타 문자는 무시
  }
  return result;
}

export function generateSKU(productName: string, weight: number) {
  const initials = getInitials(productName);
  return `${initials}-${weight}`;
}

// 고유한 파일명 생성 함수
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  return `${timestamp}-${random}.${extension}`;
}
