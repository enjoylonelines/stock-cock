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
  product_type?: ProductType;
  storage_type?: string | null; // 실온/냉장/냉동
  origin?: string | null; // 원산지
  image_url?: string;
  created_at: string;
  updated_at: string;
};

export type ProductType = "company" | "franchise" | "pb" | "material";

// Product Option (SKU)
export type ProductOption = {
  id: string;
  product_id?: string;
  sku: string;
  weight: number;
  unit_label: string;
  box_unit?: number | null;
  created_at: string;
  updated_at: string;
};

// ProductOptionView (joined view for product option + product + warehouse)
export type ProductOptionView = {
  product_option_id: string;
  sku: string;
  weight: number;
  unit_label: string;
  box_unit?: number | null;
  product_id: string;
  product_name: string;
  brand_name: string;
  category_name: string;
  product_type?: ProductType | null;
  storage_type?: string | null; // 실온/냉장/냉동
  origin?: string | null; // 원산지
  quantity: number; // 완제품용 (개수)
  weight_in_grams?: number | null; // 원재료용 (g 단위)
  warehouse_id: string;
  warehouse_name: string;
  image_url: string;
};

// Inventory (real-time stock summary)
export type Inventory = {
  id: string;
  product_option_id: string;
  warehouse_id: string;
  quantity: number | null; // 완제품용 (개수), 원재료는 NULL
  weight_in_grams?: number | null; // 원재료용 (g 단위), 완제품은 NULL
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

export type TransactionHistoryView = {
  transaction_id: string;
  type: "in" | "out" | "move" | "adjust";
  created_at: string;
  memo?: string;
  user_name?: string;
  supplier_name?: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  product_option_id: string;
  product_name: string;
  weight: number;
  unit_label: string;
  quantity: number;
  unit_price: number;
  user_image_url: string;
  product_image_url: string;
};

export interface UserInfo {
  id: string;
  name?: string;
  image_url: string;
}

export interface TeamInfo {
  id: string;
  name: string;
}
