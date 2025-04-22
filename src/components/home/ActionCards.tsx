"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  PackagePlus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Settings2,
  ArrowDownWideNarrow,
  History,
  FileDigit,
  UserRoundPlus,
  Plus,
} from "lucide-react";
import ActionButton from "./ActionButton";

export default function ActionCards() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid gap-4">
        {/* 제품 등록 카드 */}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">제품 등록</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={PackagePlus}
              iconColor="text-slate-500"
              label="제품 등록하기"
              description="새로운 제품을 등록합니다."
              formType="product"
            />
            <ActionButton
              icon={FileSpreadsheet}
              iconColor="text-green-500"
              label="엑셀 파일로 등록하기"
              description="엑셀 파일을 업로드하여 여러 제품을 한 번에 등록합니다."
              formType="excel"
            />
          </CardContent>
        </Card>

        {/* 입/출고 관리 카드 */}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">입/출고 관리</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={ArrowDownToLine}
              iconColor="text-blue-500"
              label="입고하기"
              formType="receipt"
              description="새로운 제품을 창고에 입고합니다."
            />
            <ActionButton
              icon={ArrowUpFromLine}
              iconColor="text-red-500"
              label="출고하기"
              formType="issue"
              description="창고에서 제품을 출고합니다."
            />
            <ActionButton
              icon={ArrowLeftRight}
              iconColor="text-yellow-500"
              label="이동하기"
              formType="move"
              description="제품을 다른 위치로 이동합니다."
            />
            <ActionButton
              icon={Settings2}
              iconColor="text-green-500"
              label="조정하기"
              formType="adjust"
              description="재고 수량을 조정합니다."
            />
          </CardContent>
        </Card>

        {/*재고 부족 알림 카드*/}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">재고 부족 알림</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={ArrowDownWideNarrow}
              iconColor="text-red-500"
              label="부족한 재고 확인하기"
              description="재고가 부족한 제품 목록을 확인합니다."
              formType="shortage"
            />
          </CardContent>
        </Card>

        {/*과거 수량 조회 카드*/}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">과거 수량 조회</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={History}
              iconColor="text-slate-500"
              label="제품 과거 수량 조회하기"
              description="제품의 과거 재고 수량을 조회합니다."
              formType="history"
            />
          </CardContent>
        </Card>

        {/*재고조사 카드*/}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">재고조사</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={FileDigit}
              iconColor="text-slate-500"
              label="재고 조사하기"
              description="현재 재고 상태를 조사합니다."
              formType="inventory"
            />
          </CardContent>
        </Card>

        {/*멤버 추가 카드*/}
        <Card className="shadow-sm bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">멤버 추가</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ActionButton
              icon={UserRoundPlus}
              iconColor="text-blue-500"
              label="우리팀에 멤버 추가하기"
              description="새로운 팀원을 추가합니다."
              formType="member"
            />
          </CardContent>
        </Card>

        {/*추가하기 카드*/}
        <Button className="flex justify-center shadow-sm h-14 bg-slate-50">
          <Plus className="text-slate-500" />
          <p className="text-lg text-black">추가하기</p>
        </Button>
      </div>
    </div>
  );
}
