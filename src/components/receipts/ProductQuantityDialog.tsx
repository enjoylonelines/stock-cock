import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInventories } from "@/hooks/useInventories";
import { useWarehouses } from "@/hooks/useWarehouses";
import { formatNumber } from "@/lib/utils";
import type { ProductOptionView } from "@/types/product_option_view";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const { warehouses } = useWarehouses();
  const prevProductIdRef = useRef<string | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  // 제품이 변경될 때만 추가할 수량을 0으로 초기화
  useEffect(() => {
    if (open && product) {
      const currentProductId = product.product_option_id;
      const wasClosed = prevOpenRef.current === false;

      // 다이얼로그가 방금 열렸을 때
      if (wasClosed) {
        // 제품이 변경되었으면 0으로 초기화
        // 같은 제품으로 다시 열 때는 부모에서 전달한 quantity prop을 그대로 사용 (setQuantity 호출 안 함)
        if (prevProductIdRef.current !== currentProductId) {
          setQuantity(0);
        }
        // 제품 ID 업데이트는 항상 수행
        prevProductIdRef.current = currentProductId;
      }

      prevOpenRef.current = true;
    } else {
      prevOpenRef.current = false;
    }
  }, [open, product, setQuantity]);

  // 현재 재고 계산
  const currentStock = product
    ? selectedLocationId
      ? (inventories.find(
          inv => inv.product_option_id === product.product_option_id && inv.warehouse_id === selectedLocationId
        )?.quantity ?? 0)
      : inventories
          .filter(inv => inv.product_option_id === product.product_option_id)
          .reduce((sum, inv) => sum + inv.quantity, 0)
    : 0;

  // 추가 후 재고 (현재 재고 + 추가 수량)
  const finalStock = currentStock + quantity;

  // 변화량 계산 (추가 수량)
  const changeAmount = quantity;

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
                onChange={e => {
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
              />
              <div className="text-sm text-center text-gray-500">
                <div>
                  {formatNumber(currentStock)} → {formatNumber(finalStock)}
                </div>
                {allowNegative && (
                  <div className="text-xs text-gray-400">
                    ({changeAmount > 0 ? "+" : ""}
                    {formatNumber(changeAmount)})
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full"
              onClick={() => handleQuantityChange(1)}
            >
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
