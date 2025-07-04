import { Product } from "./product";

export type ReceiptType = "IN" | "OUT";
export type ReceiptStatus = "DRAFT" | "COMPLETED";

export type Receipt = {
  id: string;
  type: ReceiptType;
  location_id: string;
  supplier_id: string;
  memo: string | null;
  status: ReceiptStatus;
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

export type ReceiptItemWithProduct = ReceiptItem & {
  product: Product;
};

export type CreateReceiptItem = {
  product_id: string;
  quantity: number;
  unit_price: number | null;
  user_id: string;
};

export type CreateReceiptRequest = {
  type: ReceiptType;
  location_id: string;
  supplier_id: string;
  memo: string | null;
  items: CreateReceiptItem[];
  created_at: string;
};
