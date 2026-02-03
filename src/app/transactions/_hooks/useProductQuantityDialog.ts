import { stockCalculator } from "@/lib/inventory/stock-calculator";
import { useInventories } from "@/hooks/useInventories";
import type { DomainInventoryItem } from "@/types/domain";
import { useEffect, useRef, useState } from "react";

type FormType = "in" | "out" | "move" | "adjust";

interface UseProductQuantityDialogProps {
  open: boolean;
  product: DomainInventoryItem | null;
  quantity: number;
  setQuantity: (quantity: number) => void;
  allowNegative?: boolean;
  selectedLocationId?: string;
  initialQuantity?: number;
  formType?: FormType;
}

/**
 * 제품 수량 다이얼로그 비즈니스 로직 훅
 */
export function useProductQuantityDialog({
  open,
  product,
  quantity,
  setQuantity,
  allowNegative = false,
  selectedLocationId,
  initialQuantity = 0,
  formType = "in",
}: UseProductQuantityDialogProps) {
  const { inventories } = useInventories();
  const hasInitializedRef = useRef(false);
  const initialQuantityRef = useRef<number>(0);
  const [inputValue, setInputValue] = useState("");

  // 현재 재고 계산 (stock-calculator 사용)
  const currentStock = product
    ? stockCalculator.getCurrentStock(product.productOptionId, inventories, selectedLocationId)
    : 0;

  // formType에 따른 최종 재고 및 표시 재고 계산
  const calculateDisplayStock = () => {
    const isInitial = quantity === initialQuantityRef.current;

    switch (formType) {
      case "in":
        // 입고: 현재 재고 + 입고량
        return isInitial ? currentStock : currentStock + quantity;
      case "out":
        // 출고: 현재 재고 - 출고량
        return isInitial ? currentStock : currentStock - quantity;
      case "move":
      case "adjust":
        // 이동/조정: 입력값 자체가 수량
        return quantity;
      default:
        return isInitial ? currentStock : currentStock + quantity;
    }
  };

  const finalStock = formType === "out" ? currentStock - quantity : currentStock + quantity;
  const changeAmount = formType === "out" ? -quantity : quantity;
  const displayStock = calculateDisplayStock();

  /**
   * 모달 최초 오픈 + inventories 준비 완료 시
   * 사용자 입력 전이라면 초기 재고를 input에 1회 세팅
   */
  useEffect(() => {
    if (!open || !product) return;
    if (hasInitializedRef.current) return;
    if (inventories.length === 0) return;

    setQuantity(currentStock);
    setInputValue(currentStock === 0 ? "" : currentStock.toString());
    initialQuantityRef.current = currentStock; // 초기 수량 저장

    hasInitializedRef.current = true;
  }, [open, product, inventories, currentStock, setQuantity]);

  /**
   * 모달 닫힐 때 초기화
   */
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      initialQuantityRef.current = 0;
      setInputValue("");
    }
  }, [open]);

  const handleQuantityChange = (delta: number) => {
    const next = allowNegative ? quantity + delta : Math.max(0, quantity + delta);
    setQuantity(next);
    setInputValue(next.toString());
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);

    if (val === "" || val === "-") return;

    const num = Number(val);
    if (!Number.isNaN(num)) {
      const clamped = allowNegative
        ? Math.max(-2147483647, Math.min(2147483647, num))
        : Math.max(0, Math.min(2147483647, num));

      setQuantity(clamped);

      if (clamped !== num) {
        setInputValue(clamped.toString());
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue === "" || inputValue === "-") {
      setInputValue("");
      return;
    }
    setInputValue(quantity.toString());
  };

  const handleConfirm = (
    onConfirm: (product: DomainInventoryItem, quantity: number) => void,
    onOpenChange: (open: boolean) => void
  ) => {
    if (!product) return;

    // 입력 안 했으면 기존값 유지
    if (inputValue === "" || inputValue === "-") {
      onConfirm(product, initialQuantity);
    } else {
      const num = Number(inputValue);
      if (!Number.isNaN(num)) {
        onConfirm(product, num);
      } else {
        onConfirm(product, quantity);
      }
    }

    onOpenChange(false);
  };

  return {
    inputValue,
    currentStock,
    finalStock,
    displayStock, // 표시할 재고 (초기에는 currentStock, 변경 후에는 finalStock)
    changeAmount,
    handleQuantityChange,
    handleInputChange,
    handleInputBlur,
    handleConfirm,
  };
}
