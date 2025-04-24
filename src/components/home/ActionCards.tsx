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
import { FormType, useDrawerStore } from "@/store/drawerStore";

// 액션 카드 데이터 정의
const actionCards = [
  {
    id: "product-registration",
    title: "제품 등록",
    buttons: [
      {
        icon: PackagePlus,
        iconColor: "text-slate-500",
        label: "제품 등록하기",
        description: "새로운 제품을 등록합니다.",
        formType: "product",
      },
      {
        icon: FileSpreadsheet,
        iconColor: "text-green-500",
        label: "엑셀 파일로 등록하기",
        description: "엑셀 파일을 업로드하여 여러 제품을 한 번에 등록합니다.",
        formType: "excel",
      },
    ],
  },
  {
    id: "inventory-management",
    title: "입/출고 관리",
    buttons: [
      {
        icon: ArrowDownToLine,
        iconColor: "text-blue-500",
        label: "입고하기",
        formType: "receipt",
      },
      {
        icon: ArrowUpFromLine,
        iconColor: "text-red-500",
        label: "출고하기",
        description: "창고에서 제품을 출고합니다.",
        formType: "issue",
      },
      {
        icon: ArrowLeftRight,
        iconColor: "text-yellow-500",
        label: "이동하기",
        description: "제품을 다른 위치로 이동합니다.",
        formType: "move",
      },
      {
        icon: Settings2,
        iconColor: "text-green-500",
        label: "조정하기",
        description: "재고 수량을 조정합니다.",
        formType: "adjust",
      },
    ],
  },
  {
    id: "low-stock-alert",
    title: "재고 부족 알림",
    buttons: [
      {
        icon: ArrowDownWideNarrow,
        iconColor: "text-red-500",
        label: "부족한 재고 확인하기",
        description: "재고가 부족한 제품 목록을 확인합니다.",
        formType: "shortage",
      },
    ],
  },
  {
    id: "history-query",
    title: "과거 수량 조회",
    buttons: [
      {
        icon: History,
        iconColor: "text-slate-500",
        label: "제품 과거 수량 조회하기",
        description: "제품의 과거 재고 수량을 조회합니다.",
        formType: "history",
      },
    ],
  },
  {
    id: "inventory-check",
    title: "재고조사",
    buttons: [
      {
        icon: FileDigit,
        iconColor: "text-slate-500",
        label: "재고 조사하기",
        description: "현재 재고 상태를 조사합니다.",
        formType: "inventory",
      },
    ],
  },
  {
    id: "member-management",
    title: "멤버 추가",
    buttons: [
      {
        icon: UserRoundPlus,
        iconColor: "text-blue-500",
        label: "우리팀에 멤버 추가하기",
        description: "새로운 팀원을 추가합니다.",
        formType: "member",
      },
    ],
  },
];

export default function ActionCards() {
  const { openDrawer } = useDrawerStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid gap-4">
        {actionCards.map((card) => (
          <Card key={card.id} className="shadow-sm bg-slate-50">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {card.buttons.map((button) => (
                <ActionButton
                  key={button.formType}
                  icon={button.icon}
                  iconColor={button.iconColor}
                  label={button.label}
                  onClick={() => {
                    openDrawer(button.formType as FormType);
                    console.log(button.formType);
                  }}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/*추가하기 카드*/}
        <Button className="flex justify-center shadow-sm h-14 bg-slate-50">
          <Plus className="text-slate-500" />
          <p className="text-lg text-black">추가하기</p>
        </Button>
      </div>
    </div>
  );
}
