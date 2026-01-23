"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  initialValue?: string;
  mode: "add" | "edit";
}

export default function LocationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValue = "",
  mode,
}: LocationFormDialogProps) {
  const [locationName, setLocationName] = useState(initialValue);

  // initialValue가 변경될 때 locationName 업데이트
  useEffect(() => {
    setLocationName(initialValue);
  }, [initialValue]);

  const handleSubmit = () => {
    if (locationName.trim()) {
      onSubmit(locationName.trim());
      setLocationName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80%] rounded-xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "새 위치 추가" : "위치 수정"}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="위치 이름을 입력하세요"
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-300 hover:bg-orange-400">
            {mode === "add" ? "추가하기" : "수정하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
