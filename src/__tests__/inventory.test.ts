import { moveInventory, setInventory } from "@/utils/inventory";

const rpc = jest.fn();
const from = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({ rpc, from })),
}));

describe("inventory mutation boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rpc.mockResolvedValue({ data: { transaction_id: "transaction-123" }, error: null });
  });

  it("sends a move as one ledgered server operation without table reads/writes", async () => {
    await expect(
      moveInventory({
        fromWarehouseId: "warehouse-from",
        toWarehouseId: "warehouse-to",
        userId: "user-789",
        memo: "shelf transfer",
        createdAt: "2026-09-24T00:00:00.000Z",
        items: [{ optionId: "option-123", quantity: 5, productType: "company" }],
      })
    ).resolves.toBe("transaction-123");

    expect(rpc).toHaveBeenCalledWith("create_inventory_move", {
      p_header: {
        from_warehouse_id: "warehouse-from",
        to_warehouse_id: "warehouse-to",
        user_id: "user-789",
        memo: "shelf transfer",
        created_at: "2026-09-24T00:00:00.000Z",
      },
      p_items: [{ option_id: "option-123", quantity: 5, product_type: "company" }],
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects invalid move input before an RPC", async () => {
    await expect(
      moveInventory({
        fromWarehouseId: "warehouse-1",
        toWarehouseId: "warehouse-1",
        userId: "user-789",
        items: [],
      })
    ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps canonical insufficient stock to a documented 409", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "INSUFFICIENT_STOCK" } });

    await expect(
      moveInventory({
        fromWarehouseId: "warehouse-from",
        toWarehouseId: "warehouse-to",
        userId: "user-789",
        items: [{ optionId: "option-123", quantity: 5 }],
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "INSUFFICIENT_STOCK" });
  });

  it("sends absolute correction only with reason and expected version", async () => {
    await setInventory({
      productOptionId: "option-123",
      warehouseId: "warehouse-456",
      quantity: 15,
      expectedVersion: 7,
      reason: "counted shelf stock",
      actorId: "user-789",
    });

    expect(rpc).toHaveBeenCalledWith("apply_inventory_adjustment", {
      p_product_option_id: "option-123",
      p_warehouse_id: "warehouse-456",
      p_quantity: 15,
      p_weight: null,
      p_expected_version: 7,
      p_reason: "counted shelf stock",
      p_actor_id: "user-789",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects an absolute correction without an explicit reason", async () => {
    await expect(
      setInventory({
        productOptionId: "option-123",
        warehouseId: "warehouse-456",
        quantity: 15,
        expectedVersion: 0,
        reason: "   ",
      })
    ).rejects.toThrow("재고 조정 사유가 필요합니다.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps the server's stale-adjustment conflict to a documented 409 error", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "INVENTORY_ADJUSTMENT_CONFLICT" } });

    await expect(
      setInventory({
        productOptionId: "option-123",
        warehouseId: "warehouse-456",
        quantity: 15,
        expectedVersion: 0,
        reason: "counted shelf stock",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "INVENTORY_ADJUSTMENT_CONFLICT" });
  });
});
