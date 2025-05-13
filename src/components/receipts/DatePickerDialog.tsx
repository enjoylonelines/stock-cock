"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export default function DatePickerDialog({ open, onOpenChange, selectedDate, onSelect }: DatePickerDialogProps) {
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onSelect(date);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xs p-0 bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>날짜 선택</DialogTitle>
        </DialogHeader>
        <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} locale={ko} />
      </DialogContent>
    </Dialog>
  );
}
