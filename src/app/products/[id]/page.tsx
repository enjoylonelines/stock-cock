"use client";

import ProductDetail from "@/components/products/ProductDetail";
import { useProduct } from "@/hooks/useProducts";
import { useParams } from "next/navigation";
import ProductDetailSkeleton from "@/components/products/ProductDetailSkeleton";

export default function ProductDetailPage() {
  const params = useParams();
  const { product, isLoading } = useProduct(params.id as string);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return <div className="container p-4 mx-auto max-w-3xl">제품을 찾을 수 없습니다.</div>;
  }

  return <ProductDetail product={product} />;
}
