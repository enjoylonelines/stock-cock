/**
 * 도메인 포맷팅 유틸리티
 *
 * 재고 단위별 표시 및 입력 파싱
 */

import type { StockUnit } from "@/types/domain";

// ============================================
// 1. 재고 표시 포맷 (1kg 미만 = g, 이상 = kg)
// ============================================
export function formatStock(value: number, unit: StockUnit): string {
  if (unit === "GRAM") {
    if (value >= 1000) {
      const kg = value / 1000;
      // 정수면 소수점 없이, 아니면 최대 2자리
      return `${kg % 1 === 0 ? kg : kg.toFixed(2).replace(/\.?0+$/, "")}kg`;
    }
    return `${value}g`;
  }
  return `${value.toLocaleString()}개`;
}

// ============================================
// 2. 수량 입력 파싱 (항상 정수로 반환)
// ============================================
export function parseQuantityInput(value: string, inputUnit: "g" | "kg", stockUnit: StockUnit): number {
  const num = Number.parseFloat(value) || 0;

  if (stockUnit === "GRAM") {
    // kg 입력이면 g으로 변환, 정수로 반올림
    return inputUnit === "kg" ? Math.round(num * 1000) : Math.round(num);
  }

  // EA는 항상 정수
  return Math.round(num);
}

// ============================================
// 3. 규격 기준 박스/봉 계산 (완제품용)
// ============================================
export function formatBoxBreakdown(quantity: number, boxUnit: number | null): string | null {
  if (!boxUnit || boxUnit <= 0 || quantity <= 0) {
    return null;
  }

  const boxes = Math.floor(quantity / boxUnit);
  const remainder = quantity % boxUnit;

  if (boxes === 0) {
    return `${remainder}봉`;
  }

  if (remainder === 0) {
    return `${boxes}박스`;
  }

  return `${boxes}박스 ${remainder}봉`;
}

// ============================================
// 4. 원재료 규격 기준 계산 (GRAM용)
// ============================================
export function formatMaterialSummary(totalGrams: number, specWeightInGrams: number, unitLabel: string | null): string | null {
  const total = Math.round(totalGrams);
  const specGrams = Math.round(specWeightInGrams);
  if (total <= 0 || specGrams <= 0) {
    return null;
  }

  // 정수 나눗셈으로 부동소수점 오차 방지 (324000g ÷ 2000g = 162 나머지 0)
  const units = Math.floor(total / specGrams);
  const remainderGrams = Math.round(total - units * specGrams);

  const specStr = formatSpecWeight(specGrams, unitLabel);

  if (units === 0) {
    // 1개 미만
    return remainderGrams >= 1000
      ? `${(remainderGrams / 1000).toFixed(2).replace(/\.?0+$/, "")}kg`
      : `${remainderGrams}g`;
  }

  if (remainderGrams === 0) {
    return `${specStr} × ${units}`;
  }

  // 잔량 포맷팅
  const remainderStr =
    remainderGrams >= 1000 ? `${(remainderGrams / 1000).toFixed(2).replace(/\.?0+$/, "")}kg` : `${remainderGrams}g`;

  return `${specStr} × ${units} + ${remainderStr}`;
}

// ============================================
// 5. 숫자 포맷 (천단위 콤마)
// ============================================
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ============================================
// 6. 중량 표시 (그램 입력 → 1kg 미만 g, 이상 kg)
// ============================================
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(2).replace(/\.?0+$/, "")}kg`;
  }
  return `${grams}g`;
}

// ============================================
// 7. 규격 중량 표시 (DB: weight는 항상 g, unit_label은 kg/g)
// ============================================
export function formatSpecWeight(weightInGrams: number, unitLabel: string | null): string {
  if (!weightInGrams || weightInGrams <= 0) return "";
  if (unitLabel === "kg") {
    const kg = weightInGrams / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(2).replace(/\.?0+$/, "")}kg`;
  }
  return formatWeight(weightInGrams);
}
