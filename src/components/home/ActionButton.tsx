"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { LucideIcon, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface ActionButtonProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  drawerContent: ReactNode;
  description?: string;
  onClose?: () => void;
}

export default function ActionButton({ icon: Icon, iconColor, label, drawerContent, onClose }: ActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

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
    onClose?.();
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
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
            <h2 className="text-lg font-medium text-orange-400">{label}</h2>
            <div className="text-sm text-gray-500">{currentTime}</div>
          </div>
        </DrawerHeader>
        {drawerContent}
      </DrawerContent>
    </Drawer>
  );
}
