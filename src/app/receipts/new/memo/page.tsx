"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function MemoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium">메모</h1>
        </div>
        <Button variant="ghost" className="text-blue-500" onClick={() => router.back()}>
          완료
        </Button>
      </div>

      {/* 메모 입력 */}
      <div className="flex-1 p-4">
        <textarea
          placeholder="메모를 입력하세요"
          className="w-full h-full p-4 text-base bg-gray-100 rounded-lg resize-none focus:outline-none"
        />
      </div>

      {/* 파일 업로드 버튼 */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full">
          파일 업로드
        </Button>
      </div>
    </div>
  );
}
