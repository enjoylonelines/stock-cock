"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ArrowLeft } from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SettingsDrawer({ isOpen, onClose, title, children }: SettingsDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[85vh]">
        {/* <DrawerHeader className="flex flex-row gap-4 items-center pb-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="-ml-2 w-8 h-8">
          <ArrowLeft className="w-4 h-4" />
          </Button>
          </DrawerHeader> */}
        <DrawerTitle className="hidden text-lg font-semibold">{title}</DrawerTitle>
        <div className="overflow-hidden flex-1">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
