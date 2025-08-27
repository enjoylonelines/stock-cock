import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ProductOptionView } from "@/types/product_option_view";
import { useInventories } from "@/hooks/useInventories";
import { useLocations } from "@/hooks/useWarehouses";

interface ProductQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductOptionView | null;
  onConfirm: (product: ProductOptionView, quantity: number) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  allowNegative?: boolean; // 조정 모드에서 음수 허용
  selectedLocationId?: string; // 조정 모드에서 현재 재고 확인용
}

export default function ProductQuantityDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  quantity,
  setQuantity,
  allowNegative = false,
  selectedLocationId,
}: ProductQuantityDialogProps) {
  const { inventories } = useInventories();
  const { locations } = useLocations();

  // 현재 재고 계산
  const currentStock =
    product && selectedLocationId
      ? inventories.find((inv) => inv.product_option_id === product.product_option_id && inv.warehouse_id === selectedLocationId)
          ?.quantity ?? 0
      : 0;

  // 조정 후 재고는 입력한 수량 그대로
  const adjustedStock = quantity;

  // 변화량 계산 (목표 재고 - 현재 재고)
  const changeAmount = quantity - currentStock;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = allowNegative ? quantity + delta : Math.max(0, quantity + delta);
    setQuantity(newQuantity);
  };

  const handleConfirm = () => {
    if (product) {
      onConfirm(product, quantity);
      onOpenChange(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 w-full max-w-xs bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>{allowNegative ? "조정 수량을 입력하세요." : "입고 수량을 입력하세요."}</DialogTitle>
          <p className="text-sm text-gray-500">{product.product_name}</p>
        </DialogHeader>
        <div className="p-4">
          <div className="flex gap-4 justify-between items-center p-4 mb-4 bg-gray-50 rounded-lg">
            <Button
              type="button"
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
                inputMode="numeric"
                pattern="[0-9]*"
                min={allowNegative ? -2147483647 : 0}
                max={2147483647}
                className="w-20 text-2xl font-semibold text-center bg-transparent border-none focus:ring-0 focus:outline-none"
                value={quantity === 0 ? "" : quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setQuantity(0);
                  } else {
                    const num = allowNegative
                      ? Math.max(-2147483647, Math.min(2147483647, Number(val)))
                      : Math.max(0, Math.min(2147483647, Number(val)));
                    setQuantity(num);
                  }
                }}
                autoFocus
              />
              {allowNegative && selectedLocationId ? (
                <div className="text-sm text-center text-gray-500">
                  <div>
                    {formatNumber(currentStock)} → {formatNumber(adjustedStock)}
                  </div>
                  <div className="text-xs text-gray-400">
                    ({changeAmount > 0 ? "+" : ""}
                    {formatNumber(changeAmount)})
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-500">→ {formatNumber(quantity)}</span>
              )}
            </div>
            <Button type="button" variant="outline" size="icon" className="w-10 h-10 rounded-full" onClick={() => handleQuantityChange(1)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" className="w-full text-white bg-blue-500 hover:bg-blue-600" onClick={handleConfirm}>
              적용
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
