// __tests__/useInventory.test.ts

import { processOut } from "@/app/lib/useInventory";

describe("processOut", () => {
  it("해당 ID 제품의 수량이 1 줄어든다", () => {
    const prev = [{ id: "001", stock: 10 }];
    const result = processOut(prev, "001");
    expect(result[0].stock).toBe(9);
  });

  it("다른 제품은 영향 안 받는다", () => {
    const prev = [
      { id: "001", stock: 10 },
      { id: "002", stock: 5 },
    ];
    const result = processOut(prev, "001");
    expect(result[1].stock).toBe(5);
  });

  it("재고가 0이면 더 줄어들지 않는다", () => {
    const prev = [{ id: "001", stock: 0 }];
    const result = processOut(prev, "001");
    expect(result[0].stock).toBe(0);
  });
});
