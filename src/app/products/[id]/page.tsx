"use client";

import ProductDetail from "@/components/products/ProductDetail";
import { useProducts } from "@/hooks/useProducts";
import { ProductOptionView } from "@/types/product_option_view";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductDetailPage() {
  const params = useParams();
  const { products } = useProducts();
  const [product, setProduct] = useState<ProductOptionView | null>(null);

  useEffect(() => {
    const productDetail = products.find((p) => p.product_option_id === params.id);
    setProduct(productDetail || null);
  }, [params.id, products]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return <ProductDetail product={product} />;
}
