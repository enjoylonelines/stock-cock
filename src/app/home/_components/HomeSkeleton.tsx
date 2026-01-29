import { Skeleton } from "@/components/ui/skeleton";

export default function HomeSkeleton() {
  return (
    <div className="space-y-6">
      {/* 통계 카드 스켈레톤 - 실제 StatsBox 크기에 맞춤 */}
      <div className="">
        {Array.from({ length: 1 }).map((_, index) => (
          <div key={`stats-skeleton-${index}`} className="p-4 bg-white rounded-lg border border-gray-200">
            <Skeleton className="mb-2 w-1/2 h-4" />
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="mt-1 w-1/3 h-3" />
          </div>
        ))}
      </div>

      {/* 액션 카드 스켈레톤 - 실제 ActionCards 크기에 맞춤 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`action-card-skeleton-${index}`} className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="flex gap-3 items-center mb-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-1/3 h-6" />
            </div>
            <Skeleton className="mb-2 w-full h-4" />
            <Skeleton className="w-2/3 h-4" />
            <div className="mt-4">
              <Skeleton className="w-full h-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* 최근 활동 스켈레톤 - 실제 CommonDrawer 크기에 맞춤 */}
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="w-1/4 h-6" />
          <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`activity-skeleton-${index}`} className="flex gap-3 p-2 bg-gray-50 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
              <Skeleton className="w-16 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
