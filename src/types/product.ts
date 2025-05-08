export interface Product {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice: number;
  category: string;
  brand: string;
  stock: number;
  imageUrl: string;
  quantity?: number;
}
