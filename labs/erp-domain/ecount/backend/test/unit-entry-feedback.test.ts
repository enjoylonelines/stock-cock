import { previewUnitEntry, unitErrorResponse } from "../src/unit-entry-feedback";

const material = {
  sku: "material-001",
  baseUnit: "g",
  conversions: { g: 1, kg: 1000 },
};

const packagedFinishedGood = {
  sku: "finished-box-001",
  baseUnit: "EA",
  conversions: { EA: 1, BOX: 24 },
};

describe("unit entry feedback", () => {
  it("shows a normalized preview before a material line is submitted", () => {
    expect(previewUnitEntry(2, "kg", material)).toEqual({
      kind: "valid",
      baseQuantity: 2000,
      baseUnit: "g",
      allowedUnits: ["g", "kg"],
      message: "2 kg → 2000 g",
    });
  });

  it("keeps an incompatible unit editable and gives allowed choices", () => {
    expect(previewUnitEntry(2, "EA", material)).toEqual({
      kind: "invalid",
      baseUnit: "g",
      allowedUnits: ["g", "kg"],
      message: "material-001에는 g, kg 단위만 사용할 수 있습니다.",
    });
    expect(unitErrorResponse(3, material)).toEqual({
      code: "INVALID_DOCUMENT_UNIT",
      lineIndex: 3,
      message: "material-001의 입력 단위를 g, kg 중 하나로 바꿔 주세요.",
      allowedUnits: ["g", "kg"],
      baseUnit: "g",
    });
  });

  it("uses the product-specific package conversion", () => {
    expect(previewUnitEntry(2, "BOX", packagedFinishedGood)).toMatchObject({
      kind: "valid",
      baseQuantity: 48,
      baseUnit: "EA",
    });
  });
});
