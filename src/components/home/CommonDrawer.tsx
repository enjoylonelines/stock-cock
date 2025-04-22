"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDrawerStore } from "@/store/drawerStore";
import NewReceiptForm from "@/components/receipts/NewReceiptForm";
import { useEffect, useState } from "react";

export default function CommonDrawer() {
  const { isOpen, currentForm, closeDrawer } = useDrawerStore();
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const getFormTitle = () => {
    switch (currentForm) {
      case "receipt":
        return "입고하기";
      case "issue":
        return "출고하기";
      case "move":
        return "이동하기";
      case "adjust":
        return "조정하기";
      default:
        return "";
    }
  };

  const getFormDescription = () => {
    switch (currentForm) {
      case "receipt":
        return "새로운 제품을 창고에 입고합니다.";
      case "issue":
        return "창고에서 제품을 출고합니다.";
      case "move":
        return "제품을 다른 위치로 이동합니다.";
      case "adjust":
        return "재고 수량을 조정합니다.";
      default:
        return "";
    }
  };

  const renderForm = () => {
    switch (currentForm) {
      case "receipt":
        return <NewReceiptForm />;
      case "issue":
        return <div>출고 폼</div>;
      case "move":
        return <div>이동 폼</div>;
      case "adjust":
        return <div>조정 폼</div>;
      default:
        return null;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <DrawerContent className="h-[95vh] flex flex-col" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={closeDrawer} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex items-center justify-between py-2 border-b-2 border-orange-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-orange-400">{getFormTitle()}</DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">{getFormDescription()}</DrawerDescription>
            </div>
            <div className="text-sm text-gray-500">{currentTime}</div>
          </div>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">{renderForm()}</div>
      </DrawerContent>
    </Drawer>
  );
}
