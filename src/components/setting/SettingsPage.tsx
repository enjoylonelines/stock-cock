"use client";

import { logout } from "@/app/auth/actions";
import ManageView from "@/components/receipts/ManageView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useLocations } from "@/hooks/useWarehouses";
import type { TeamInfo, UserInfo } from "@/types/database";
import { Camera, ChevronRight, LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import PushNotificationSettings from "./PushNotificationSettings";
import SettingsDrawer from "./SettingsDrawer";

interface InfoData {
  productCount: number;
  memberCount: number;
  locationCount: number;
  supplierCount: number;
}

export default function SettingsPage({ user, _team, info }: { user: UserInfo; _team?: TeamInfo; info: InfoData }) {
  const [isWarehousesDrawerOpen, setIsWarehousesDrawerOpen] = useState(false);
  const [isSuppliersDrawerOpen, setIsSuppliersDrawerOpen] = useState(false);

  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();

  return (
    <div className="container p-4 mx-auto space-y-6 max-w-3xl">
      {/* 팀 정보 */}
      <Card className="p-0 bg-white">
        <CardContent className="overflow-hidden relative p-0 h-48 rounded-xl">
          <Image src="/images/team-cover.png" alt="팀 커버 이미지" fill className="object-cover brightness-[0.85]" />
          {/* 팀 정보 오버레이 */}
          <div className="absolute right-0 bottom-0 left-0 p-4 text-white">
            <h2 className="mb-1 text-2xl font-bold">한끼</h2>
            <p className="text-sm opacity-90">
              품목 {info.productCount} · 멤버 {info.memberCount}
            </p>
          </div>
          {/* 사용자 정보 */}
          <div className="flex absolute top-4 right-4 gap-3 items-center px-4 py-2 rounded-full bg-black/20">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name ?? "이름없음"}</p>
              {/* <p className="text-xs text-white/80">{user?.role ?? "권한없음"}</p> */}
            </div>
            <Avatar className="w-8 h-8 border-2 border-white/50">
              <AvatarImage src="/images/avatar-1.png" alt={user?.name ?? "아바타"} />
              <AvatarFallback>{user?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </div>
          {/* 설정 버튼 */}
          <div className="absolute top-4 left-4">
            <Button
              size="icon"
              variant="outline"
              className="w-8 h-8 backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/20"
            >
              <Camera className="w-4 h-4 text-white" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 제품 설정 */}
      {/* <div>
        <h2 className="mb-2 text-lg font-bold">제품 설정</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium">제품 속성 설정</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">3개 속성</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium">표시 형식 설정</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">가격 + 전체속성</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div> */}

      {/* 재고 부족 알림 */}
      {/* <div>
        <h2 className="mb-2 text-lg font-bold">재고 부족 알림</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex justify-between items-center px-2 py-3">
              <h3 className="font-medium">알림 설정</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">재고 부족시 알림</p>
                <Switch />
              </div>
            </div>
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium">알림 대상</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">합산 재고, 기본 위치</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium">알림 시간</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">오전 9시</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div> */}

      {/* 알림 설정 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">알림 설정</h2>
        <Card className="p-2">
          <CardContent className="p-0">
            <PushNotificationSettings />
          </CardContent>
        </Card>
      </div>

      {/* 거래처 설정 */}
      <div>
        <h2 className="mb-2 text-lg font-bold">거래처 설정</h2>
        <Card className="p-2">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="flex justify-between items-center px-2 py-3 w-full text-left"
              onClick={() => setIsWarehousesDrawerOpen(true)}
            >
              <h3 className="text-base font-medium">입고처 설정</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">{info.locationCount}개 입고처</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button
              variant="ghost"
              className="flex justify-between items-center px-2 py-3 w-full text-left"
              onClick={() => setIsSuppliersDrawerOpen(true)}
            >
              <h3 className="text-base font-medium">출고처 설정</h3>
              <div className="flex gap-2 items-center">
                <p className="text-sm text-gray-500">{info.supplierCount}개 출고처</p>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 로그아웃 */}
      <form action={logout}>
        <h2 className="mb-2 text-lg font-bold">계정</h2>
        <Card className="p-2">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="flex justify-between items-center px-2 py-3 w-full text-left text-red-600 hover:text-red-700 hover:bg-red-50"
              type="submit"
            >
              <div className="flex gap-3 items-center">
                <LogOut className="w-5 h-5" />
                <h3 className="text-base font-medium">로그아웃</h3>
              </div>
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* 입고처 관리 드로어 */}
      <SettingsDrawer
        isOpen={isWarehousesDrawerOpen}
        onClose={() => setIsWarehousesDrawerOpen(false)}
        title="입고처 관리"
      >
        <ManageView
          onBack={() => setIsWarehousesDrawerOpen(false)}
          onSelect={() => {}} // 선택 기능은 필요 없음
          title="입고처 관리"
          items={locations}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
        />
      </SettingsDrawer>

      {/* 출고처 관리 드로어 */}
      <SettingsDrawer
        isOpen={isSuppliersDrawerOpen}
        onClose={() => setIsSuppliersDrawerOpen(false)}
        title="출고처 관리"
      >
        <ManageView
          onBack={() => setIsSuppliersDrawerOpen(false)}
          onSelect={() => {}} // 선택 기능은 필요 없음
          title="출고처 관리"
          items={suppliers}
          onAdd={addSupplier}
          onEdit={editSupplier}
          onDelete={deleteSupplier}
        />
      </SettingsDrawer>

      {/* 지원 */}
      {/* <div>
        <h2 className="mb-2 text-lg font-bold">지원</h2>
        <Card className="p-2">
          <CardContent className="flex flex-col gap-2 p-0">
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium">문의하기</h3>
              <div className="flex gap-2 items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
            <Button variant="ghost" className="flex justify-between items-center px-2 py-3 w-full text-left">
              <h3 className="text-base font-medium text-red-500">데이터 삭제</h3>
              <div className="flex gap-2 items-center">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
