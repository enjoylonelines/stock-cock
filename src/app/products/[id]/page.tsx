"use client";

import ProductDetail from "@/components/products/ProductDetail";
import { useProducts } from "@/hooks/useProducts";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Product } from "@/types/product";

export default function ProductDetailPage() {
  const params = useParams();
  const { products } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const productDetail = products.find((p) => p.option_id === params.id);
    setProduct(productDetail || null);
  }, [params.id, products]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return <ProductDetail product={product} />;
}
