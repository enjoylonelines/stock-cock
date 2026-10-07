import {
  type CreateInventoryDocumentCommand,
  type InventoryDocumentWorkflowPort,
  InventoryDocumentWorkflowService,
} from "../src/inventory-document-workflow";

const receipt: CreateInventoryDocumentCommand = {
  tenantId: "tenant-a",
  type: "receipt",
  idempotencyKey: "receipt-001",
  lines: [{ productId: "sku-finished-001", quantity: 10, destinationLocationId: "receiving-a" }],
};

const draft = {
  id: "document-001",
  tenantId: "tenant-a",
  type: "receipt" as const,
  status: "DRAFT" as const,
  idempotencyKey: "receipt-001",
};

describe("InventoryDocumentWorkflowService", () => {
  const port: jest.Mocked<InventoryDocumentWorkflowPort> = {
    createDraft: jest.fn(),
    confirm: jest.fn(),
    postConfirmed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    port.createDraft.mockResolvedValue(draft);
    port.confirm.mockResolvedValue({ ...draft, status: "CONFIRMED" });
    port.postConfirmed.mockResolvedValue({ ...draft, status: "POSTED" });
  });

  it("passes a validated receipt command to the draft port exactly once", async () => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(service.createDraft(receipt)).resolves.toEqual(draft);
    expect(port.createDraft).toHaveBeenCalledTimes(1);
    expect(port.createDraft).toHaveBeenCalledWith(receipt);
  });

  it.each([
    { ...receipt, tenantId: "" },
    { ...receipt, idempotencyKey: "" },
    { ...receipt, lines: [] },
    { ...receipt, lines: [{ productId: "sku-finished-001", quantity: 0, destinationLocationId: "receiving-a" }] },
    { ...receipt, lines: [{ productId: "sku-finished-001", quantity: 10 }] },
  ])("rejects invalid receipt input before the port is called", async invalidCommand => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(service.createDraft(invalidCommand)).rejects.toThrow();
    expect(port.createDraft).not.toHaveBeenCalled();
  });

  it("requires different locations for a transfer", async () => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(
      service.createDraft({
        ...receipt,
        type: "transfer",
        lines: [
          {
            productId: "sku-finished-001",
            quantity: 10,
            sourceLocationId: "picking-a",
            destinationLocationId: "picking-a",
          },
        ],
      })
    ).rejects.toThrow("transfer source and destination must differ");
  });

  it("requires a source shipment and source line for a return", async () => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(
      service.createDraft({
        ...receipt,
        type: "return",
        lines: [{ productId: "sku-finished-001", quantity: 2, destinationLocationId: "returns-a" }],
      })
    ).rejects.toThrow("sourceDocumentId is required");

    await expect(
      service.createDraft({
        ...receipt,
        type: "return",
        sourceDocumentId: "shipment-001",
        lines: [{ productId: "sku-finished-001", quantity: 2, destinationLocationId: "returns-a" }],
      })
    ).rejects.toThrow("sourceDocumentLineId is required");
  });

  it.each([
    { type: "adjustment_in" as const, line: { productId: "sku-finished-001", quantity: 2 } },
    { type: "adjustment_out" as const, line: { productId: "sku-finished-001", quantity: 2 } },
  ])("rejects an adjustment without its required inventory location", async ({ type, line }) => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(service.createDraft({ ...receipt, type, lines: [line] })).rejects.toThrow();
  });

  it("keeps confirmation and posting as explicit workflow calls", async () => {
    const service = new InventoryDocumentWorkflowService(port);

    await expect(service.confirm("document-001", "tenant-a")).resolves.toMatchObject({ status: "CONFIRMED" });
    await expect(service.postConfirmed("document-001", "tenant-a")).resolves.toMatchObject({ status: "POSTED" });

    expect(port.confirm).toHaveBeenCalledWith("document-001", "tenant-a");
    expect(port.postConfirmed).toHaveBeenCalledWith("document-001", "tenant-a");
  });
});
