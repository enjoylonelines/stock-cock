"use client";

import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  onClick: () => void;
}

export default function ActionButton({ icon: Icon, iconColor, label, onClick }: ActionButtonProps) {
  return (
    <Button variant="ghost" className="justify-start h-12 text-base" onClick={onClick}>
      <Icon className={`w-5 h-5 mr-2 ${iconColor}`} />
      {label}
    </Button>
  );
}
