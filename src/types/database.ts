export type Location = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  unit: string;
  created_at: string;
  updated_at: string;
};

export type Receipt = {
  id: string;
  type: "IN" | "OUT";
  location_id: string;
  supplier_id: string;
  memo: string | null;
  status: "DRAFT" | "COMPLETED";
  created_at: string;
  updated_at: string;
};

export type ReceiptItem = {
  id: string;
  receipt_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};
