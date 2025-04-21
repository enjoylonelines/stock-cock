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
import { useRouter } from "next/navigation";

export default function ActionCards() {
  const router = useRouter();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 제품 등록 카드 */}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">제품 등록</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base">
            <PackagePlus className="w-5 h-5 mr-2 text-slate-500" />
            제품 등록하기
          </Button>
          <Button variant="ghost" className="justify-start h-12 text-base">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-green-500" />
            엑셀 파일로 등록하기
          </Button>
        </CardContent>
      </Card>

      {/* 입/출고 관리 카드 */}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">입/출고 관리</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base" onClick={() => router.push("/receipts/new")}>
            <ArrowDownToLine className="w-5 h-5 mr-2 text-blue-500" />
            입고하기
          </Button>
          <Button variant="ghost" className="justify-start h-12 text-base">
            <ArrowUpFromLine className="w-5 h-5 mr-2 text-red-500" />
            출고하기
          </Button>
          <Button variant="ghost" className="justify-start h-12 text-base">
            <ArrowLeftRight className="w-5 h-5 mr-2 text-yellow-500" />
            이동하기
          </Button>
          <Button variant="ghost" className="justify-start h-12 text-base">
            <Settings2 className="w-5 h-5 mr-2 text-green-500" />
            조정하기
          </Button>
        </CardContent>
      </Card>

      {/*재고 부족 알림 카드*/}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">재고 부족 알림</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base">
            <ArrowDownWideNarrow className="w-5 h-5 mr-2 text-red-500" />
            부족한 재고 확인하기
          </Button>
        </CardContent>
      </Card>

      {/*과거 수량 조회 카드*/}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">과거 수량 조회</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base">
            <History className="w-5 h-5 mr-2 text-slate-500" />
            제품 과거 수량 조회하기
          </Button>
        </CardContent>
      </Card>

      {/*재고조사 카드*/}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">재고조사</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base">
            <FileDigit className="w-5 h-5 mr-2 text-slate-500" />
            재고 조사하기
          </Button>
        </CardContent>
      </Card>

      {/*멤버 추가 카드*/}
      <Card className="shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold">멤버 추가</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="ghost" className="justify-start h-12 text-base">
            <UserRoundPlus className="w-5 h-5 mr-2 text-blue-500" />
            우리팀에 멤버 추가하기
          </Button>
        </CardContent>
      </Card>

      {/*추가하기 카드*/}
      <Button className="flex justify-center shadow-sm h-14 bg-slate-50">
        <Plus className="text-slate-500" />
        <p className="text-lg text-black">추가하기</p>
      </Button>
    </div>
  );
}
