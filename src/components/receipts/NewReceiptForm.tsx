"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewReceiptForm() {
  return (
    <div className="flex flex-col h-full">
      {/* 입고 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Link href="/receipts/new/location">
            <Button variant="ghost" className="flex items-center justify-between w-full py-2" size="none">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">위치</h3>
                <p className="text-sm text-gray-500">기본 위치</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/supplier">
            <Button variant="ghost" className="flex items-center justify-between w-full py-2" size="none">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">입고처</h3>
                <p className="text-sm text-gray-500">선택</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/products">
            <Button variant="ghost" className="flex items-center justify-between w-full py-2" size="none">
              <div className="flex justify-between w-full">
                <h3 className="font-medium">제품</h3>
                <p className="text-sm text-gray-500">0개 품목</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </Link>

          <Link href="/receipts/new/memo">
            <Button variant="ghost" className="flex items-center justify-between w-full py-2" size="none">
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
          <Button className="flex-1 text-gray-800 bg-orange-200">입고 완료</Button>
        </div>
      </div>
    </div>
  );
}
