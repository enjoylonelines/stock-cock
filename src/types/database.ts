// Product category
export type Category = {
  id: string;
  name: string;
};

// Brand
export type Brand = {
  id: string;
  name: string;
};

// Warehouse
export type Warehouse = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
};

// Product
export type Product = {
  id: string;
  name: string;
  category_id: string;
  brand_id: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

// Product Option (SKU)
export type ProductOption = {
  id: string;
  product_id?: string;
  sku: string;
  weight: number;
  unit_label: string;
  buy_price: number;
  sell_price: number;
  created_at: string;
  updated_at: string;
};

// Inventory (real-time stock summary)
export type Inventory = {
  id: string;
  product_option_id: string;
  warehouse_id: string;
  quantity: number;
  updated_at: string;
};

// Inventory Batch (per expiration date)
export type InventoryBatch = {
  id: string;
  product_option_id: string;
  warehouse_id: string;
  expiration_date: string;
  quantity: number;
  unit_price: number;
  lot_no?: string;
  memo?: string;
  created_at: string;
};

// Supplier
export type Supplier = {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  created_at: string;
};

// User
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

// Transaction
export type Transaction = {
  id: string;
  type: "in" | "out" | "move" | "adjust";
  user_id: string;
  supplier_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  memo?: string;
  created_at: string;
};

// Transaction Item
export type TransactionItem = {
  id: string;
  transaction_id: string;
  product_option_id: string;
  batch_id?: string;
  quantity: number;
  unit_price: number;
};

// Adjustment
export type Adjustment = {
  id: string;
  product_option_id: string;
  warehouse_id: string;
  before_quantity: number;
  after_quantity: number;
  reason: string;
  user_id: string;
  created_at: string;
};
