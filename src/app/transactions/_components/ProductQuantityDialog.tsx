import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import type { ProductOptionView } from "@/types/database";
import { Minus, Plus } from "lucide-react";

type FormType = "in" | "out" | "move" | "adjust";

interface ProductQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductOptionView | null;
  onConfirm: (product: ProductOptionView, quantity: number) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  allowNegative?: boolean;
  selectedLocationId?: string;
  initialQuantity?: number;
  formType?: FormType;
  // Hook 결과를 props로 받음 (순수 UI 컴포넌트)
  inputValue: string;
  currentStock: number;
  finalStock: number;
  displayStock: number;
  changeAmount: number;
  handleQuantityChange: (delta: number) => void;
  handleInputChange: (val: string) => void;
  handleInputBlur: () => void;
}

/**
 * 제품 수량 다이얼로그 컴포넌트 (순수 UI)
 */
const FORM_TYPE_TITLES: Record<FormType, string> = {
  in: "입고 수량을 입력하세요",
  out: "출고 수량을 입력하세요",
  move: "이동 수량을 입력하세요",
  adjust: "조정 수량을 입력하세요",
};

export default function ProductQuantityDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  quantity,
  allowNegative = false,
  formType = "in",
  inputValue,
  currentStock,
  finalStock,
  displayStock,
  changeAmount,
  handleQuantityChange,
  handleInputChange,
  handleInputBlur,
}: ProductQuantityDialogProps) {
  const handleConfirm = () => {
    if (!product) return;
    onConfirm(product, quantity);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-full max-w-xs bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>{FORM_TYPE_TITLES[formType]}</DialogTitle>
          <p className="text-sm text-gray-500">{product.product_name}</p>
        </DialogHeader>

        <div className="p-4">
          <div className="flex gap-4 justify-between items-center p-4 mb-4 bg-gray-50 rounded-lg">
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full"
              onClick={() => handleQuantityChange(-1)}
              disabled={!allowNegative && quantity <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>

            <div className="flex flex-col items-center">
              <input
                type="number"
                className="w-20 text-2xl font-semibold text-center bg-transparent border-none focus:outline-none"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
              />

              <div className="text-sm text-center text-gray-500">
                <div>
                  {displayStock === currentStock ? (
                    formatNumber(currentStock)
                  ) : (
                    <>
                      {formatNumber(currentStock)} → {formatNumber(displayStock)}
                    </>
                  )}
                </div>
                {allowNegative && changeAmount !== 0 && (
                  <div className="text-xs text-gray-400">
                    ({changeAmount > 0 ? "+" : ""}
                    {formatNumber(changeAmount)})
                  </div>
                )}
              </div>
            </div>

            <Button variant="outline" size="icon" className="w-10 h-10 rounded-full" onClick={() => handleQuantityChange(1)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button className="text-white bg-blue-500" onClick={handleConfirm}>
              적용
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
