import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";

interface SkeletonListProps {
  count?: number;
  children: (index: number) => ReactNode;
  className?: string;
}

/**
 * 공통 Skeleton List 컴포넌트
 * 반복되는 스켈레톤 아이템을 쉽게 생성할 수 있습니다.
 */
export default function SkeletonList({ count = 6, children, className }: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{children(index)}</div>
      ))}
    </div>
  );
}

/**
 * 공통 Skeleton Card 컴포넌트
 * 카드 형태의 스켈레톤을 쉽게 생성할 수 있습니다.
 */
interface SkeletonCardProps {
  imageSize?: string;
  titleWidth?: string;
  subtitleWidth?: string;
  showImage?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function SkeletonCard({
  imageSize = "w-14 h-14",
  titleWidth = "w-2/3",
  subtitleWidth = "w-1/2",
  showImage = true,
  showSubtitle = true,
  className = "",
}: SkeletonCardProps) {
  return (
    <div className={`p-4 bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="flex gap-4 items-center">
        {showImage && <Skeleton className={`${imageSize} rounded-md`} />}
        <div className="flex-1">
          <Skeleton className={`h-5 ${titleWidth} mb-1`} />
          {showSubtitle && <Skeleton className={`h-4 ${subtitleWidth}`} />}
        </div>
      </div>
    </div>
  );
}

