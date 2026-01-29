import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailSkeleton() {
  return (
    <div className="container p-4 mx-auto space-y-4 max-w-3xl">
      <Card className="p-0 bg-white">
        <CardContent className="p-6">
          <div className="flex gap-4 items-start">
            {/* 제품 이미지 스켈레톤 */}
            <Skeleton className="w-32 h-32 rounded-lg" />

            <div className="flex-1 space-y-3">
              {/* 제품명 스켈레톤 */}
              <Skeleton className="h-8 w-3/4" />

              {/* 가격 정보 스켈레톤 */}
              <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>

              {/* 카테고리, 브랜드 정보 스켈레톤 */}
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 재고 정보 스켈레톤 */}
      <Card className="p-0 bg-white">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`stock-info-skeleton-${index}`} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 재고 변동 내역 스켈레톤 */}
      <Card className="p-0 bg-white">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`history-skeleton-${index}`} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
