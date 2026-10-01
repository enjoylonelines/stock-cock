/** @jest-environment node */
import { POST } from "@/app/api/transactions/route";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionNotification } from "@/utils/transaction-notification";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/utils/transaction-notification", () => ({ sendTransactionNotification: jest.fn() }));
jest.mock("@/utils/logger", () => ({
  apiLogger: {
    requestStart: jest.fn(),
    requestSuccess: jest.fn(),
    requestError: jest.fn(),
    dbError: jest.fn(),
  },
}));

const rpc = jest.fn();
const validBody = {
  type: "out",
  user_id: "user-id",
  warehouse_id: "warehouse-id",
  items: [{ option_id: "option-id", quantity: 1, product_type: "company" }],
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transactions consistency error contract", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (createClient as jest.Mock).mockResolvedValue({ rpc });
    (sendTransactionNotification as jest.Mock).mockResolvedValue(true);
  });

  it.each([
    ["P0001", "INSUFFICIENT_STOCK", 409, "INSUFFICIENT_STOCK"],
    ["P0002", "INVENTORY_NOT_FOUND", 409, "INVENTORY_NOT_FOUND"],
    ["22023", "INVALID_QUANTITY", 400, "INVALID_TRANSACTION_INPUT"],
    ["P0001", "unrelated database exception", 500, "P0001"],
    ["P0003", "AMBIGUOUS_INVENTORY", 500, "P0003"],
    ["23503", "foreign key violation", 500, "23503"],
    ["40P01", "deadlock detected", 500, "40P01"],
    ["57014", "statement timeout", 500, "57014"],
  ])("maps %s / %s to HTTP %i without retry or notification", async (sqlstate, message, status, code) => {
    rpc.mockResolvedValue({ data: null, error: { code: sqlstate, message } });
    const response = await POST(request(validBody));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(expect.objectContaining({ code, statusCode: status }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendTransactionNotification).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...validBody, type: undefined },
    { ...validBody, type: "move" },
    { ...validBody, items: [] },
    { ...validBody, items: [null] },
    { ...validBody, items: [{ option_id: "option-id", quantity: 0 }] },
    { ...validBody, items: [{ option_id: "option-id", quantity: -1 }] },
    { ...validBody, items: [{ option_id: "option-id", quantity: "1" }] },
    { ...validBody, items: [{ option_id: "option-id", quantity: null }] },
    { ...validBody, items: [{ option_id: "option-id", quantity: 0.5, product_type: "material" }] },
  ])("rejects malformed arithmetic input before RPC: %j", async body => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(sendTransactionNotification).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON as a client error", async () => {
    const response = await POST(new Request("http://localhost/api/transactions", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves numeric fractional quantity and the existing successful response", async () => {
    rpc.mockResolvedValue({ data: { transaction_id: "tx-id" }, error: null });
    const response = await POST(
      request({
        ...validBody,
        items: [{ option_id: "option-id", quantity: 0.5, product_type: "company" }],
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, transaction_id: "tx-id" });
    expect(rpc).toHaveBeenCalledWith("create_transaction", {
      p_header: expect.objectContaining({ type: "out", warehouse_id: "warehouse-id" }),
      p_items: [{ option_id: "option-id", quantity: 0.5, product_type: "company" }],
    });
    expect(sendTransactionNotification).toHaveBeenCalledTimes(1);
  });

  it("leaves omitted product type for the database to resolve", async () => {
    rpc.mockResolvedValue({ data: { transaction_id: "tx-id" }, error: null });
    const response = await POST(
      request({
        ...validBody,
        items: [{ option_id: "option-id", quantity: 1 }],
      })
    );
    expect(response.status).toBe(200);
    expect(rpc.mock.calls[0][1].p_items).toEqual([{ option_id: "option-id", quantity: 1 }]);
  });

  it("does not announce success while the RPC is unresolved", async () => {
    let resolveRpc!: (value: unknown) => void;
    let signalStarted!: () => void;
    const started = new Promise<void>(resolve => {
      signalStarted = resolve;
    });
    rpc.mockImplementation(() => {
      signalStarted();
      return new Promise(resolve => {
        resolveRpc = resolve;
      });
    });
    const pending = POST(request(validBody));
    await started;
    expect(sendTransactionNotification).not.toHaveBeenCalled();
    resolveRpc({ data: { transaction_id: "tx-id" }, error: null });
    const response = await pending;
    expect(response.status).toBe(200);
    expect(sendTransactionNotification).toHaveBeenCalledTimes(1);
  });

  it("does not retry a committed RPC when notification reports failure", async () => {
    rpc.mockResolvedValue({ data: { transaction_id: "tx-id" }, error: null });
    (sendTransactionNotification as jest.Mock).mockResolvedValue(false);
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("treats missing RPC success payload as a server failure", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(sendTransactionNotification).not.toHaveBeenCalled();
  });
});
