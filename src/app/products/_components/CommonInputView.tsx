"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { memo } from "react";

interface CommonInputViewProps {
  title: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  onClose: () => void;
}

/**
 * 공통 입력 뷰 컴포넌트
 */
export const CommonInputView = memo(function CommonInputView({
  title,
  value,
  onChange,
  placeholder,
  onClose,
}: CommonInputViewProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col flex-1 justify-center px-6">
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="p-3 w-full text-lg rounded border focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <Button className="mt-6 text-white bg-orange-500 hover:bg-orange-600" onClick={onClose}>
          완료
        </Button>
      </div>
    </div>
  );
});
