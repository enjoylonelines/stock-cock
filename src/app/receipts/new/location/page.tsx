"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LocationPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium">기본 위치</h1>
      </div>

      {/* 위치 목록 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="flex items-center justify-between w-full px-4 py-3 border rounded-lg"
            onClick={() => router.back()}
          >
            <div>
              <h3 className="font-medium">기본 위치</h3>
              <p className="text-sm text-gray-500">✓</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
