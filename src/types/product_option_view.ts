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
  product_type?: "company" | "franchise" | "pb" | null;
  quantity: number;
  warehouse_id: string;
  warehouse_name: string;
  image_url: string;
};
