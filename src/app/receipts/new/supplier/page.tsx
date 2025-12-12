"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupplierPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium">입고처</h1>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* 검색 */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="입고처 검색"
          className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none"
        />
      </div>

      {/* 입고처 목록 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="flex items-center justify-between w-full px-4 py-3 border rounded-lg"
            onClick={() => router.back()}
          >
            <div>
              <h3 className="font-medium">기본 입고처</h3>
              <p className="text-sm text-gray-500">✓</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
