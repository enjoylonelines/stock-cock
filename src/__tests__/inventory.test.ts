import { setInventory, updateInventory } from "@/utils/inventory";
import type { SupabaseClient } from "@supabase/supabase-js";

// 테스트용 mock supabase 클라이언트
const createMockSupabase = (fromImpl: (table: string) => object) =>
  ({ from: jest.fn().mockImplementation(fromImpl) }) as unknown as SupabaseClient;

describe("updateInventory", () => {
  const productOptionId = "option-123";
  const warehouseId = "warehouse-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("기존 재고가 있는 경우", () => {
    it("재고 수량을 증가시킨다", async () => {
      const existingInventory = {
        id: "inv-123",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 10,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase((table: string) => {
        if (table === "inventory") return { select: selectMock, update: updateMock };
        return {};
      });

      await updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 5 });

      expect(selectMock).toHaveBeenCalledWith("*");
      expect(updateMock).toHaveBeenCalledWith({ quantity: 15 });
    });

    it("재고 수량을 감소시킨다", async () => {
      const existingInventory = {
        id: "inv-123",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 10,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase((table: string) => {
        if (table === "inventory") return { select: selectMock, update: updateMock };
        return {};
      });

      await updateInventory(supabase, { productOptionId, warehouseId, quantityChange: -3 });

      expect(updateMock).toHaveBeenCalledWith({ quantity: 7 });
    });

    it("재고 조회 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "조회 실패" } }),
          }),
        }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock }));

      await expect(updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 5 })).rejects.toThrow(
        "재고 조회 실패: 조회 실패"
      );
    });

    it("재고 업데이트 실패 시 에러를 던진다", async () => {
      const existingInventory = {
        id: "inv-123",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 10,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "업데이트 실패" } }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await expect(updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 5 })).rejects.toThrow(
        "재고 업데이트 실패: 업데이트 실패"
      );
    });
  });

  describe("기존 재고가 없는 경우", () => {
    it("새로운 재고를 생성한다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 10 });

      expect(insertMock).toHaveBeenCalledWith([
        { product_option_id: productOptionId, warehouse_id: warehouseId, quantity: 10 },
      ]);
    });

    it("음수 수량으로도 재고를 생성할 수 있다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, quantityChange: -5 });

      expect(insertMock).toHaveBeenCalledWith([
        { product_option_id: productOptionId, warehouse_id: warehouseId, quantity: -5 },
      ]);
    });

    it("재고 생성 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: { message: "생성 실패" } });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await expect(updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 10 })).rejects.toThrow(
        "재고 생성 실패: 생성 실패"
      );
    });
  });

  describe("재고 수량이 null인 경우", () => {
    it("null을 0으로 처리하여 재고를 증가시킨다", async () => {
      const existingInventory = {
        id: "inv-123",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, quantityChange: 5 });

      expect(updateMock).toHaveBeenCalledWith({ quantity: 5 });
    });
  });

  describe("원재료(isMaterial) 경로", () => {
    it("기존 재고가 있을 때 weight_in_grams를 양수 weightChange로 증가시킨다", async () => {
      const existingInventory = {
        id: "inv-material-1",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        weight_in_grams: 5000,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightChange: 2000 });

      // 5000g + 2000g = 7000g
      expect(updateMock).toHaveBeenCalledWith({ weight_in_grams: 7000 });
    });

    it("기존 재고가 있을 때 weight_in_grams를 음수 weightChange로 감소시킨다", async () => {
      const existingInventory = {
        id: "inv-material-2",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        weight_in_grams: 8000,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightChange: -3000 });

      // 8000g - 3000g = 5000g
      expect(updateMock).toHaveBeenCalledWith({ weight_in_grams: 5000 });
    });

    it("기존 재고가 없을 때 weight_in_grams로 새 재고 레코드를 생성한다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightChange: 1500 });

      expect(insertMock).toHaveBeenCalledWith([
        {
          product_option_id: productOptionId,
          warehouse_id: warehouseId,
          weight_in_grams: 1500,
          quantity: null,
        },
      ]);
    });

    it("weight_in_grams가 null인 기존 재고를 0으로 처리하여 증가시킨다", async () => {
      const existingInventory = {
        id: "inv-material-null",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        weight_in_grams: null,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await updateInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightChange: 500 });

      // null → 0 + 500 = 500
      expect(updateMock).toHaveBeenCalledWith({ weight_in_grams: 500 });
    });

    it("업데이트 실패 시 에러를 던진다", async () => {
      const existingInventory = {
        id: "inv-material-err",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        weight_in_grams: 1000,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "DB 잠금 오류" } }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await expect(
        updateInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightChange: 100 })
      ).rejects.toThrow("재고 업데이트 실패: DB 잠금 오류");
    });
  });
});

describe("setInventory", () => {
  const productOptionId = "option-set-123";
  const warehouseId = "warehouse-set-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("완제품 (isMaterial: false)", () => {
    it("기존 재고가 없을 때 quantity로 새 레코드를 삽입한다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await setInventory(supabase, { productOptionId, warehouseId, quantity: 20 });

      expect(insertMock).toHaveBeenCalledWith([
        { product_option_id: productOptionId, warehouse_id: warehouseId, quantity: 20 },
      ]);
    });

    it("기존 재고가 있을 때 quantity를 목표값으로 덮어쓴다", async () => {
      const existingInventory = {
        id: "inv-finished-1",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 50,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await setInventory(supabase, { productOptionId, warehouseId, quantity: 30 });

      // 기존 50에서 30으로 직접 설정 (차분 계산 아님)
      expect(updateMock).toHaveBeenCalledWith({ quantity: 30 });
    });

    it("quantity 미전달 시 0으로 설정한다", async () => {
      const existingInventory = {
        id: "inv-finished-zero",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 10,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await setInventory(supabase, { productOptionId, warehouseId });

      expect(updateMock).toHaveBeenCalledWith({ quantity: 0 });
    });
  });

  describe("원재료 (isMaterial: true)", () => {
    it("기존 재고가 없을 때 weight_in_grams로 새 레코드를 삽입하고 quantity는 null이다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await setInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightInGrams: 3000 });

      expect(insertMock).toHaveBeenCalledWith([
        {
          product_option_id: productOptionId,
          warehouse_id: warehouseId,
          weight_in_grams: 3000,
          quantity: null,
        },
      ]);
    });

    it("기존 재고가 있을 때 weight_in_grams를 목표값으로 덮어쓰고 quantity를 null로 설정한다", async () => {
      const existingInventory = {
        id: "inv-mat-set-1",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        weight_in_grams: 10000,
        quantity: null,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await setInventory(supabase, { productOptionId, warehouseId, isMaterial: true, weightInGrams: 6000 });

      // 기존 10000g에서 6000g으로 직접 설정, quantity는 null로 명시
      expect(updateMock).toHaveBeenCalledWith({ weight_in_grams: 6000, quantity: null });
    });

    it("weightInGrams 미전달 시 0으로 설정한다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await setInventory(supabase, { productOptionId, warehouseId, isMaterial: true });

      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ weight_in_grams: 0, quantity: null }),
      ]);
    });
  });

  describe("에러 처리", () => {
    it("재고 조회 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "조회 오류" } }),
          }),
        }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock }));

      await expect(setInventory(supabase, { productOptionId, warehouseId, quantity: 5 })).rejects.toThrow(
        "재고 조회 실패: 조회 오류"
      );
    });

    it("업데이트 실패 시 에러를 던진다", async () => {
      const existingInventory = {
        id: "inv-set-err",
        product_option_id: productOptionId,
        warehouse_id: warehouseId,
        quantity: 10,
      };

      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: existingInventory, error: null }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "업데이트 실패" } }),
      });

      const supabase = createMockSupabase(() => ({ select: selectMock, update: updateMock }));

      await expect(setInventory(supabase, { productOptionId, warehouseId, quantity: 5 })).rejects.toThrow(
        "재고 업데이트 실패: 업데이트 실패"
      );
    });

    it("삽입 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: { message: "삽입 실패" } });

      const supabase = createMockSupabase(() => ({ select: selectMock, insert: insertMock }));

      await expect(setInventory(supabase, { productOptionId, warehouseId, quantity: 5 })).rejects.toThrow(
        "재고 생성 실패: 삽입 실패"
      );
    });
  });
});
