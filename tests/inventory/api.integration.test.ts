/** @jest-environment node */
// Opt-in: real route handler + Supabase JS + standalone PostgREST + PostgreSQL.
// This does not start a Next HTTP server or test session authentication.
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { POST } from "@/app/api/transactions/route";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionNotification } from "@/utils/transaction-notification";
import { type SupabaseClient, createClient as createSupabaseClient } from "@supabase/supabase-js";

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

const enabled = process.env.INVENTORY_DB_INTEGRATION === "1";
const endpoint = "http://127.0.0.1:55440";
const observations: unknown[] = [];
const runId = randomUUID();
let client: SupabaseClient;

function token() {
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 600,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", "inventory-test-only-jwt-secret-never-production")
    .update(`${head}.${body}`)
    .digest("base64url");
  return `${head}.${body}.${signature}`;
}

async function insert(table: string, values: object | object[]) {
  const { error } = await client.from(table).insert(values);
  if (error) throw new Error(`fixture ${table}: ${error.code} ${error.message}`);
}

async function fixture() {
  const warehouse = randomUUID();
  const product = randomUUID();
  const option = randomUUID();
  await insert("warehouses", { id: warehouse, name: `api-test-${runId}` });
  await insert("products", { id: product, name: `api-test-${runId}`, product_type: "company" });
  await insert("product_options", { id: option, product_id: product, sku: `api-test-${option}` });
  await insert("inventory", { product_option_id: option, warehouse_id: warehouse, quantity: 1 });
  return { warehouse, option };
}

async function stock(warehouse: string) {
  const { data, error } = await client
    .from("inventory")
    .select("product_option_id,quantity,weight_in_grams")
    .eq("warehouse_id", warehouse);
  if (error) throw error;
  return data;
}

async function ledger(memo: string) {
  const { data, error } = await client
    .from("transactions")
    .select("id,memo,transaction_items(product_option_id,quantity)")
    .eq("memo", memo);
  if (error) throw error;
  return data;
}

async function invoke(body: object) {
  const response = await POST(
    new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return { status: response.status, body: await response.json() };
}

(enabled ? describe : describe.skip)("isolated PostgREST transaction integration", () => {
  beforeAll(() => {
    if (process.env.INVENTORY_POSTGREST_URL && process.env.INVENTORY_POSTGREST_URL !== endpoint) {
      throw new Error("Only the dedicated 127.0.0.1:55440 test endpoint is allowed");
    }
    const nativeFetch = globalThis.fetch.bind(globalThis);
    client = createSupabaseClient(endpoint, token(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input, init) => {
          const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
          if (url.origin !== endpoint || !url.pathname.startsWith("/rest/v1/")) {
            throw new Error("Refusing a non-test or non-PostgREST request");
          }
          // Standalone PostgREST lacks the Supabase gateway's /rest/v1 prefix.
          url.pathname = url.pathname.slice("/rest/v1".length);
          return nativeFetch(url, { ...init, redirect: "error" });
        },
      },
    });
    (createClient as jest.Mock).mockResolvedValue(client);
    (sendTransactionNotification as jest.Mock).mockResolvedValue(true);
  });

  beforeEach(() => {
    (sendTransactionNotification as jest.Mock).mockClear();
  });

  afterAll(() => {
    const destination = path.join(process.cwd(), `tests/inventory/results/api-integration-${runId}.json`);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(
      destination,
      JSON.stringify(
        {
          runId,
          endpoint,
          boundary: "in-process route + real Supabase JS/PostgREST/PG; test factory auth; mocked notification",
          observations,
        },
        null,
        2
      )
    );
  });

  it("commits a successful receipt and exposes the committed ledger", async () => {
    const f = await fixture();
    const memo = `api-success-${runId}`;
    const response = await invoke({
      type: "in",
      user_id: randomUUID(),
      warehouse_id: f.warehouse,
      memo,
      items: [{ option_id: f.option, quantity: 2 }],
    });
    const inventory = await stock(f.warehouse);
    const transactions = await ledger(memo);
    observations.push({ case: "success", response, inventory, transactions });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(inventory).toEqual([{ product_option_id: f.option, quantity: 3, weight_in_grams: null }]);
    expect(transactions).toHaveLength(1);
    expect(transactions?.[0].id).toBe(response.body.transaction_id);
    expect(transactions?.[0].transaction_items).toEqual([{ product_option_id: f.option, quantity: 2 }]);
    expect(sendTransactionNotification).toHaveBeenCalledTimes(1);
  });

  it("returns stable insufficient-stock 409 with no committed effects", async () => {
    const f = await fixture();
    const memo = `api-insufficient-${runId}`;
    const first = await invoke({
      type: "out",
      user_id: randomUUID(),
      warehouse_id: f.warehouse,
      memo: `${memo}-first`,
      items: [{ option_id: f.option, quantity: 1 }],
    });
    expect(first.status).toBe(200);
    expect(sendTransactionNotification).toHaveBeenCalledTimes(1);
    (sendTransactionNotification as jest.Mock).mockClear();
    const before = await stock(f.warehouse);
    expect(before?.[0].quantity).toBe(0);
    const response = await invoke({
      type: "out",
      user_id: randomUUID(),
      warehouse_id: f.warehouse,
      memo,
      items: [{ option_id: f.option, quantity: 1 }],
    });
    const inventory = await stock(f.warehouse);
    const transactions = await ledger(memo);
    const firstTransactions = await ledger(`${memo}-first`);
    observations.push({
      case: "insufficient_after_committed_outbound",
      first,
      firstTransactions,
      response,
      before,
      inventory,
      transactions,
    });
    expect(firstTransactions).toHaveLength(1);
    expect(firstTransactions?.[0].id).toBe(first.body.transaction_id);
    expect(firstTransactions?.[0].transaction_items).toEqual([{ product_option_id: f.option, quantity: 1 }]);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INSUFFICIENT_STOCK");
    expect(inventory).toEqual(before);
    expect(transactions).toEqual([]);
    expect(sendTransactionNotification).not.toHaveBeenCalled();
  });

  it("keeps a supplier FK failure technical and leaves no transaction effects", async () => {
    const f = await fixture();
    const memo = `api-fk-${runId}`;
    const before = await stock(f.warehouse);
    const response = await invoke({
      type: "in",
      user_id: randomUUID(),
      warehouse_id: f.warehouse,
      supplier_id: randomUUID(),
      memo,
      items: [{ option_id: f.option, quantity: 2 }],
    });
    const inventory = await stock(f.warehouse);
    const transactions = await ledger(memo);
    observations.push({ case: "header_fk_failure", response, before, inventory, transactions });
    expect(response.status).toBe(500);
    expect(response.body.code).toBe("23503");
    expect(inventory).toEqual(before);
    expect(transactions).toEqual([]);
    expect(sendTransactionNotification).not.toHaveBeenCalled();
  });
});
