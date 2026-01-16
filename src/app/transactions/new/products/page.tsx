"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Filter } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium">제품</h1>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* 검색 */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="제품 이름, 바코드, 속성 검색"
          className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none"
        />
      </div>

      {/* 제품 목록 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="flex items-center justify-between w-full px-4 py-3 border rounded-lg"
            onClick={() => router.back()}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 overflow-hidden rounded-lg bg-gray-100">
                <Image src="/images/product-1.png" alt="제품 이미지" fill className="object-cover" />
              </div>
              <div>
                <h3 className="font-medium">고기왕만두</h3>
                <p className="text-sm text-gray-500">29,900 | 20,000 만두 | 더바른한끼 | 1,000</p>
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">수량</p>
            <p className="text-lg font-medium">0개</p>
          </div>
          <Button className="px-8 bg-gray-900">선택 완료</Button>
        </div>
      </div>
    </div>
  );
}
