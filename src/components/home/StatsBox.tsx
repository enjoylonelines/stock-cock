"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryStore } from "@/store/inventory";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function StatsBox() {
  const { totalStock, records } = useInventoryStore();
  const today = new Date();
  const todayStr = format(today, "M월 d일", { locale: ko });

  // 오늘 날짜의 입/출고 기록만 필터링
  const todayRecords = records.filter((record) => format(record.timestamp, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));

  // 오늘의 입/출고 수량 계산
  const todayInbound = todayRecords.filter((record) => record.type === "IN").reduce((sum, record) => sum + record.quantity, 0);

  const todayOutbound = todayRecords.filter((record) => record.type === "OUT").reduce((sum, record) => sum + record.quantity, 0);

  return (
    <Card className="bg-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>재고 현황</span>
          <span className="text-base font-normal text-muted-foreground">{todayStr}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">총 재고</p>
            <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">입고</p>
            <p className="text-2xl font-bold text-green-600">{todayInbound.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">출고</p>
            <p className="text-2xl font-bold text-red-600">{todayOutbound.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
