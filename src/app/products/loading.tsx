import ProductListSkeleton from "@/components/products/ProductListSkeleton";

export default function Loading() {
  return (
    <div className="container p-4 mx-auto">
      <ProductListSkeleton />
    </div>
  );
}
