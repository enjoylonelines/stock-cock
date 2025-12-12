import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface MemoViewProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onDone: () => void;
}

export default function MemoView({ value, onChange, onBack, onDone }: MemoViewProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-semibold">메모</span>
        <Button variant="ghost" onClick={onDone}>
          완료
        </Button>
      </div>
      {/* 메모 입력 */}
      <div className="flex-1 p-4">
        <textarea
          className="w-full h-32 p-3 text-base border rounded resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="메모 입력"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
