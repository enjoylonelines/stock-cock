export interface Product {
  option_id: string;
  product_id: string;
  sku: string;
  weight: number;
  buy_price: number;
  sell_price: number;
  product_name: string;
  image_url: string;
  category_name: string;
  brand_name: string;
  created_at?: string;
  updated_at?: string;
  total_stock: number;
}
