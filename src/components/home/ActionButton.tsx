"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { LucideIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDrawerStore } from "@/store/drawerStore";
import NewReceiptForm from "@/components/receipts/NewReceiptForm";

interface ActionButtonProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  formType: "receipt" | "issue" | "move" | "adjust" | "shortage" | "inventory" | "history" | "member" | "product" | "excel";
  description: string;
}

export default function ActionButton({ icon: Icon, iconColor, label, formType, description }: ActionButtonProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const { isOpen, currentForm, openDrawer, closeDrawer } = useDrawerStore();

  // 현재 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    closeDrawer();
  };

  const isCurrentFormOpen = isOpen && currentForm === formType;
  return (
    <Drawer open={isCurrentFormOpen} onOpenChange={(open) => (open ? openDrawer(formType) : closeDrawer())}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="justify-start h-12 text-base">
          <Icon className={`w-5 h-5 mr-2 ${iconColor}`} />
          {label}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[95vh]">
        <DrawerHeader className="py-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={handleClose} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex items-center justify-between py-2 border-b-2 border-orange-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-orange-400">{label}</DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">{description}</DrawerDescription>
            </div>
            <div className="text-sm text-gray-500">{currentTime}</div>
          </div>
        </DrawerHeader>
        <DrawerFormContent />
      </DrawerContent>
    </Drawer>
  );
}

function DrawerFormContent() {
  const { currentForm } = useDrawerStore();

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
}
