import ProductListSkeleton from "./_components/ProductListSkeleton";

export default function Loading() {
  return (
    <div className="container p-4 mx-auto max-w-3xl">
      <ProductListSkeleton />
    </div>
  );
}
