import HomeSkeleton from "@/components/home/HomeSkeleton";

export default function Loading() {
  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <HomeSkeleton />
    </div>
  );
}
