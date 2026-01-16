import { updateInventory } from "@/utils/inventory";
import { supabase } from "@/lib/supabase";

// supabase 모킹
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

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
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingInventory,
              error: null,
            }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "inventory") {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      });

      await updateInventory(productOptionId, warehouseId, 5);

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
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingInventory,
              error: null,
            }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "inventory") {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      });

      await updateInventory(productOptionId, warehouseId, -3);

      expect(updateMock).toHaveBeenCalledWith({ quantity: 7 });
    });

    it("재고 조회 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "조회 실패" },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      await expect(updateInventory(productOptionId, warehouseId, 5)).rejects.toThrow("재고 조회 실패: 조회 실패");
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
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingInventory,
              error: null,
            }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: "업데이트 실패" },
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        update: updateMock,
      });

      await expect(updateInventory(productOptionId, warehouseId, 5)).rejects.toThrow("재고 업데이트 실패: 업데이트 실패");
    });
  });

  describe("기존 재고가 없는 경우", () => {
    it("새로운 재고를 생성한다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        insert: insertMock,
      });

      await updateInventory(productOptionId, warehouseId, 10);

      expect(insertMock).toHaveBeenCalledWith([
        {
          product_option_id: productOptionId,
          warehouse_id: warehouseId,
          quantity: 10,
        },
      ]);
    });

    it("음수 수량으로도 재고를 생성할 수 있다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        insert: insertMock,
      });

      await updateInventory(productOptionId, warehouseId, -5);

      expect(insertMock).toHaveBeenCalledWith([
        {
          product_option_id: productOptionId,
          warehouse_id: warehouseId,
          quantity: -5,
        },
      ]);
    });

    it("재고 생성 실패 시 에러를 던진다", async () => {
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const insertMock = jest.fn().mockResolvedValue({
        error: { message: "생성 실패" },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        insert: insertMock,
      });

      await expect(updateInventory(productOptionId, warehouseId, 10)).rejects.toThrow("재고 생성 실패: 생성 실패");
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
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingInventory,
              error: null,
            }),
          }),
        }),
      });

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock,
        update: updateMock,
      });

      await updateInventory(productOptionId, warehouseId, 5);

      expect(updateMock).toHaveBeenCalledWith({ quantity: 5 });
    });
  });
});
