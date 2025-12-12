"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStats } from "@/hooks/useStats";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function StatsBox() {
  const { summary, error, isLoading } = useStats();
  const today = new Date();
  const todayStr = format(today, "M월 d일", { locale: ko });

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
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">총 재고</p>
            <p className="text-2xl font-bold">{isLoading ? "-" : summary.total.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">입고</p>
            <p className="text-2xl font-bold text-green-600">{isLoading ? "-" : summary.in.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">출고</p>
            <p className="text-2xl font-bold text-red-600">{isLoading ? "-" : summary.out.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
