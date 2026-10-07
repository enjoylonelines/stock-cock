export interface ProductUnitPolicy {
  sku: string;
  baseUnit: string;
  conversions: Record<string, number>;
}

export interface UnitEntryPreview {
  kind: "valid" | "invalid";
  baseQuantity?: number;
  baseUnit: string;
  allowedUnits: string[];
  message: string;
}

/**
 * Presentation-only boundary for a document-line UI. It does not replace the
 * database validation: the server still rejects an unsupported unit.
 */
export function previewUnitEntry(
  inputQuantity: number,
  inputUnit: string,
  policy: ProductUnitPolicy
): UnitEntryPreview {
  const allowedUnits = Object.keys(policy.conversions).sort();
  const conversion = policy.conversions[inputUnit];

  if (!Number.isFinite(inputQuantity) || inputQuantity <= 0) {
    return {
      kind: "invalid",
      baseUnit: policy.baseUnit,
      allowedUnits,
      message: "수량은 0보다 커야 합니다.",
    };
  }

  if (conversion === undefined) {
    return {
      kind: "invalid",
      baseUnit: policy.baseUnit,
      allowedUnits,
      message: `${policy.sku}에는 ${allowedUnits.join(", ")} 단위만 사용할 수 있습니다.`,
    };
  }

  const baseQuantity = inputQuantity * conversion;
  return {
    kind: "valid",
    baseQuantity,
    baseUnit: policy.baseUnit,
    allowedUnits,
    message: `${inputQuantity} ${inputUnit} → ${baseQuantity} ${policy.baseUnit}`,
  };
}

export function unitErrorResponse(
  lineIndex: number,
  policy: ProductUnitPolicy
): {
  code: "INVALID_DOCUMENT_UNIT";
  lineIndex: number;
  message: string;
  allowedUnits: string[];
  baseUnit: string;
} {
  const allowedUnits = Object.keys(policy.conversions).sort();
  return {
    code: "INVALID_DOCUMENT_UNIT",
    lineIndex,
    message: `${policy.sku}의 입력 단위를 ${allowedUnits.join(", ")} 중 하나로 바꿔 주세요.`,
    allowedUnits,
    baseUnit: policy.baseUnit,
  };
}
