import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      <div className="space-y-4">
        <Skeleton className="w-1/3 h-6" />
        <Skeleton className="w-2/3 h-4" />
        <Skeleton className="w-full h-48 rounded-lg" />
      </div>
    </div>
  );
}
