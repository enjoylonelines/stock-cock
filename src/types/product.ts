export type Product = {
  id: string;
  name: string;
  sell_price: number;
  buy_price: number;
  category: string;
  brand: string;
  image_url: string;
  quantity?: number;
  created_at: string; // yyyy-mm-dd hh:mm:ss
  updated_at: string; // yyyy-mm-dd hh:mm:ss
};
