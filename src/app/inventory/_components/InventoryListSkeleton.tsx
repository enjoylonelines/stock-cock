import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`inventory-skeleton-${index}`} className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex gap-4">
            {/* 제품 이미지 스켈레톤 - 실제 크기에 맞춤 */}
            <Skeleton className="w-16 h-16 rounded-lg" />

            <div className="flex-1 space-y-2">
              {/* 제품명 스켈레톤 */}
              <Skeleton className="h-5 w-2/3" />

              {/* 창고 정보 스켈레톤 */}
              <Skeleton className="h-4 w-1/2" />

              {/* 수량 정보 스켈레톤 - 실제 레이아웃에 맞춤 */}
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>

            {/* 상태 및 날짜 스켈레톤 */}
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
