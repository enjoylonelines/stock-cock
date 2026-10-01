import {
  InventoryMoveApplicationService,
  type InventoryMoveCommand,
  type InventoryMoveWriteContract,
} from "@/lib/inventory/move-application-service";

const command: InventoryMoveCommand = {
  fromWarehouseId: "warehouse-from",
  toWarehouseId: "warehouse-to",
  userId: "user-789",
  memo: "shelf transfer",
  createdAt: "2026-09-25T00:00:00.000Z",
  items: [{ optionId: "option-123", quantity: 5, productType: "company" }],
};

describe("InventoryMoveApplicationService", () => {
  const createLedgeredMove = jest.fn<
    ReturnType<InventoryMoveWriteContract["createLedgeredMove"]>,
    [InventoryMoveCommand]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    createLedgeredMove.mockResolvedValue("transaction-123");
  });

  it("passes one validated command to the single write contract and preserves its result", async () => {
    const service = new InventoryMoveApplicationService({ createLedgeredMove });

    await expect(service.execute(command)).resolves.toBe("transaction-123");

    expect(createLedgeredMove).toHaveBeenCalledTimes(1);
    expect(createLedgeredMove).toHaveBeenCalledWith(command);
  });

  it.each([
    { ...command, toWarehouseId: command.fromWarehouseId },
    { ...command, items: [] },
    { ...command, items: [{ optionId: "option-123", quantity: 0 }] },
  ])("rejects an invalid command before the write contract", async invalidCommand => {
    const service = new InventoryMoveApplicationService({ createLedgeredMove });

    await expect(service.execute(invalidCommand)).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(createLedgeredMove).not.toHaveBeenCalled();
  });

  it("does not turn a writer failure into a second command", async () => {
    createLedgeredMove.mockRejectedValueOnce(new Error("database unavailable"));
    const service = new InventoryMoveApplicationService({ createLedgeredMove });

    await expect(service.execute(command)).rejects.toThrow("database unavailable");
    expect(createLedgeredMove).toHaveBeenCalledTimes(1);
  });
});
