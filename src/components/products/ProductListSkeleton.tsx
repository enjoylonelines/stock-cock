import { Skeleton } from "@/components/ui/skeleton";

export default function ProductListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="px-4 py-2 bg-slate-50 rounded-lg border border-gray-200">
          <div className="flex gap-4 items-center">
            {/* 제품 이미지 스켈레톤 - 실제 크기 14x14 */}
            <Skeleton className="w-14 h-14 rounded-md" />

            <div className="flex-1">
              {/* 제품명 스켈레톤 - 실제 크기에 맞춤 */}
              <Skeleton className="h-5 w-2/3 mb-1" />

              {/* 가격, 카테고리, 브랜드 정보 스켈레톤 - 실제 레이아웃에 맞춤 */}
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>

            {/* 재고 수량 스켈레톤 - 실제 크기 text-2xl */}
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
