import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const status = spawnSync("pnpm", ["dlx", "supabase", "status", "-o", "env"], { encoding: "utf8" });
if (status.status !== 0) throw new Error(status.stderr || "Local Supabase is not running");
const env = Object.fromEntries(
  `${status.stdout}\n${status.stderr}`.split("\n").flatMap(line => {
    const delimiter = line.indexOf("=");
    return delimiter > 0 ? [[line.slice(0, delimiter), line.slice(delimiter + 1).replace(/^"|"$/g, "")]] : [];
  })
);
const url = env.API_URL;
const serviceRoleKey = env.SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Local Supabase URL or service key is unavailable");

const email = "portfolio-demo@stock-cock.local";
const password = "DemoPass!2026";
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (users.error) throw users.error;
let user = users.data.users.find(candidate => candidate.email === email);
if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "포트폴리오 데모" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Demo user creation failed");
  user = created.data.user;
}

const fixture = {
  categoryId: "10000000-0000-4000-8000-000000000001",
  brandId: "10000000-0000-4000-8000-000000000002",
  warehouseId: "10000000-0000-4000-8000-000000000003",
  productId: "10000000-0000-4000-8000-000000000004",
  optionId: "10000000-0000-4000-8000-000000000005",
  inventoryId: "10000000-0000-4000-8000-000000000006",
  inboundId: "10000000-0000-4000-8000-000000000007",
  outboundId: "10000000-0000-4000-8000-000000000008",
  inboundItemId: "10000000-0000-4000-8000-000000000009",
  outboundItemId: "10000000-0000-4000-8000-000000000010",
};
const upsert = async (table, values) => {
  const result = await admin.from(table).upsert(values, { onConflict: "id" });
  if (result.error) throw result.error;
};

await upsert("profiles", { id: user.id, name: "포트폴리오 데모", email });
await upsert("categories", { id: fixture.categoryId, name: "데모 완제품" });
await upsert("brands", { id: fixture.brandId, name: "로컬 Fixture" });
await upsert("warehouses", { id: fixture.warehouseId, name: "로컬 데모 창고", description: "capture-only fixture" });
await upsert("products", {
  id: fixture.productId,
  name: "데모 도시락",
  category_id: fixture.categoryId,
  brand_id: fixture.brandId,
  product_type: "company",
  storage_type: "refrigerated",
  origin: "local fixture",
});
await upsert("product_options", {
  id: fixture.optionId,
  product_id: fixture.productId,
  sku: "DEMO-LUNCH-001",
  weight: 1,
  unit_label: "EA",
  box_unit: 1,
});
await upsert("inventory", {
  id: fixture.inventoryId,
  product_option_id: fixture.optionId,
  warehouse_id: fixture.warehouseId,
  quantity: 260,
});
await upsert("transactions", [
  {
    id: fixture.inboundId,
    type: "in",
    user_id: user.id,
    to_warehouse_id: fixture.warehouseId,
    memo: "로컬 데모 입고",
    created_at: "2026-10-13T09:00:00+09:00",
  },
  {
    id: fixture.outboundId,
    type: "out",
    user_id: user.id,
    from_warehouse_id: fixture.warehouseId,
    memo: "로컬 데모 출고",
    created_at: "2026-10-13T10:00:00+09:00",
  },
]);
await upsert("transaction_items", [
  { id: fixture.inboundItemId, transaction_id: fixture.inboundId, product_option_id: fixture.optionId, quantity: 300 },
  { id: fixture.outboundItemId, transaction_id: fixture.outboundId, product_option_id: fixture.optionId, quantity: 40 },
]);

console.log(JSON.stringify({ email, userId: user.id, fixture: "local-only", inventory: 260, transactions: 2 }));
