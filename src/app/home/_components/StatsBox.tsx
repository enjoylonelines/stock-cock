"use client";

import { useStats } from "@/app/home/_hooks/useStats";
import { formatStock } from "@/lib/domain/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function StatsBox() {
  const { summary, error } = useStats();
  const todayStr = format(new Date(), "M월 d일", { locale: ko });

  if (error) {
    return (
      <Card className="bg-orange-200">
        <CardContent className="pt-6">
          <p className="text-red-500">데이터를 불러오는데 실패했습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-orange-200">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>재고 현황</span>
          <span className="text-base font-normal text-muted-foreground">{todayStr}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 min-w-0">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">총 재고</p>
            <p className="text-xl font-bold truncate">{summary.total.toLocaleString()}</p>
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">입고</p>
            <p className="text-xl font-bold text-green-600 truncate">{summary.in.toLocaleString()}</p>
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">출고</p>
            <p className="text-xl font-bold text-red-600 truncate">{summary.out.toLocaleString()}</p>
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">원재료 사용량</p>
            <p className="text-xl font-bold text-red-600 truncate">
              {formatStock(summary.materialOutGrams ?? 0, "GRAM")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
