import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Product } from "@/types/product";
import { formatNumber } from "@/lib/utils";

interface ProductQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (product: Product, quantity: number) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
}

export default function ProductQuantityDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  quantity,
  setQuantity,
}: ProductQuantityDialogProps) {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(0, quantity + delta);
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
      <DialogContent className="w-full max-w-xs p-0 bg-white rounded-lg">
        <DialogHeader className="px-4 py-5 text-center border-b">
          <DialogTitle>입고 수량을 입력하세요.</DialogTitle>
          <p className="text-sm text-gray-500">{product.name}</p>
        </DialogHeader>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 p-4 mb-4 rounded-lg bg-gray-50">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-semibold">{formatNumber(quantity)}</span>
              <span className="text-sm text-gray-500">→ {formatNumber(quantity)}</span>
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
