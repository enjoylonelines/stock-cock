"use client";

import { Camera, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="container max-w-3xl p-4 mx-auto space-y-6">
      {/* 팀 정보 */}
      <Card className="p-0 bg-white">
        <CardContent className="relative h-48 p-0 overflow-hidden rounded-xl">
          <Image src="/images/team-cover.png" alt="팀 커버 이미지" fill className="object-cover brightness-[0.85]" />
          {/* 팀 정보 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h2 className="mb-1 text-2xl font-bold">한끼</h2>
            <p className="text-sm opacity-90">품목 4 · 위치 2 · 멤버 3</p>
          </div>
          {/* 사용자 정보 */}
          <div className="absolute flex items-center gap-3 px-4 py-2 rounded-full top-4 right-4 bg-black/20">
            <div className="text-right">
              <p className="text-sm font-medium text-white">김관리</p>
              <p className="text-xs text-white/80">관리자</p>
            </div>
            <Avatar className="w-8 h-8 border-2 border-white/50">
              <AvatarImage src="/images/avatar-1.png" alt="김관리" />
              <AvatarFallback>김</AvatarFallback>
            </Avatar>
          </div>
          {/* 설정 버튼 */}
          <div className="absolute top-4 left-4">
            <Button size="icon" variant="outline" className="w-8 h-8 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
              <Camera className="w-4 h-4 text-white" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 제품 설정 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">제품 설정</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">제품 속성 설정</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">3개 속성</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">표시 형식 설정</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">가격 + 전체속성</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 재고 부족 알림 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">재고 부족 알림</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center justify-between px-2 py-3">
              <h3 className="font-medium">알림 설정</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">재고 부족시 알림</p>
                <Switch />
              </div>
            </div>
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left ">
              <h3 className="text-base font-medium">알림 대상</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">합산 재고, 기본 위치</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">알림 시간</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">오전 9시</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 거래처 설정 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">거래처 설정</h2>
        <Card className="p-2">
          <CardContent className="p-0">
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">입고처 설정</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">1개 입고처</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">출고처 설정</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">0개 출고처</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 지원 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">지원</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium">문의하기</h3>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex items-center justify-between w-full px-2 py-3 text-left">
              <h3 className="text-base font-medium text-red-500">데이터 삭제</h3>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
