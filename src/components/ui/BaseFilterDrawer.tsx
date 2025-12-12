"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface BaseFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: () => void;
  onReset: () => void;
  title: string;
  description: string;
  children: ReactNode;
  applyButtonText?: string;
  resetButtonText?: string;
}

/**
 * 공통 Filter Drawer 컴포넌트
 * 모든 필터 드로어의 공통 UI 구조를 제공합니다.
 */
export default function BaseFilterDrawer({
  isOpen,
  onClose,
  onApplyFilter,
  onReset,
  title,
  description,
  children,
  applyButtonText = "필터 적용",
  resetButtonText = "초기화",
}: BaseFilterDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
      <DrawerContent className="h-[90vh] flex flex-col max-w-3xl mx-auto" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="flex justify-end w-8 h-8"
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex justify-between items-center py-2 border-b-2 border-blue-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-blue-400">{title}</DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">{description}</DrawerDescription>
            </div>
            <Button variant="ghost" onClick={onReset}>
              {resetButtonText}
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">{children}</div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t">
          <Button
            className="w-full h-12 text-lg font-semibold text-white bg-blue-500 hover:bg-blue-600"
            onClick={onApplyFilter}
          >
            {applyButtonText}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
