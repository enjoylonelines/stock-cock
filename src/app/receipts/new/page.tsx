"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewReceiptPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => router.back()}>
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium">입고서</h1>
        </div>
        <div className="text-sm text-gray-500">현재 시간</div>
      </div>

      {/* 입고 정보 */}
      <div className="flex-1 p-4">
        <h2 className="mb-4 text-lg font-medium text-blue-500">입고 정보</h2>
        <div className="space-y-2">
          <Link href="/receipts/new/location">
            <Button variant="ghost" className="flex items-center justify-between w-full px-0 py-3">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">위치</h3>
                <p className="text-sm text-gray-500">기본 위치</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/supplier">
            <Button variant="ghost" className="flex items-center justify-between w-full px-0 py-3">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">입고처</h3>
                <p className="text-sm text-gray-500">선택</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/products">
            <Button variant="ghost" className="flex items-center justify-between w-full px-0 py-3">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">제품</h3>
                <p className="text-sm text-gray-500">0개 품목</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/memo">
            <Button variant="ghost" className="flex items-center justify-between w-full px-0 py-3">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">메모</h3>
                <p className="text-sm text-gray-500">작성</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            임시 저장
          </Button>
          <Button className="flex-1 bg-gray-900">입고 완료</Button>
        </div>
      </div>
    </div>
  );
}
