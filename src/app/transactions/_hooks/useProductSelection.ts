import { stockCalculator } from "@/lib/inventory/stock-calculator";
import { useInventories } from "@/hooks/useInventories";
import type { ProductOptionView } from "@/types/database";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseProductSelectionOptions {
  products: ProductOptionView[];
  allowNegative?: boolean;
  selectedLocationId?: string;
  initialSelectedProducts?: ProductOptionView[];
}

/**
 * 제품 선택 비즈니스 로직 훅
 */
export function useProductSelection({
  products,
  allowNegative = false,
  selectedLocationId,
  initialSelectedProducts = [],
}: UseProductSelectionOptions) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<ProductOptionView[]>(initialSelectedProducts);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOptionView | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [initialQuantity, setInitialQuantity] = useState(0);
  const { inventories } = useInventories();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevVisualViewportRef = useRef<number>(0);
  const initialViewportHeightRef = useRef<number>(0);

  // initialSelectedProducts가 변경되면 로컬 state 업데이트
  useEffect(() => {
    setSelectedProducts(initialSelectedProducts);
  }, [initialSelectedProducts]);

  // iOS 감지 함수
  const isIOS = () => {
    if (typeof window === "undefined") return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  // 검색 인풋 포커스 시 visualViewport 변경 감지 및 드로어 높이 조정 (iOS만)
  useEffect(() => {
    // iOS가 아니면 뷰포트 조정 로직 실행하지 않음
    if (!isIOS()) return;

    const searchInput = searchInputRef.current;
    if (!searchInput) return;

    const handleVisualViewportResize = () => {
      const searchInput = searchInputRef.current;
      if (searchInput && searchInput === document.activeElement && window.visualViewport) {
        const currentVisualViewport = window.visualViewport.height;

        if (currentVisualViewport < initialViewportHeightRef.current * 0.8) {
          const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
          if (drawerContent) {
            drawerContent.style.height = `${currentVisualViewport}px`;
            drawerContent.style.maxHeight = `${currentVisualViewport}px`;
          }
        } else if (currentVisualViewport >= initialViewportHeightRef.current * 0.95) {
          const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
          if (drawerContent) {
            drawerContent.style.height = "90vh";
            drawerContent.style.maxHeight = "90vh";
          }
        }

        prevVisualViewportRef.current = currentVisualViewport;
      }
    };

    const handleFocus = () => {
      if (window.visualViewport) {
        const initialHeight = window.visualViewport.height;
        initialViewportHeightRef.current = initialHeight;
        prevVisualViewportRef.current = initialHeight;
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
        if (drawerContent) {
          drawerContent.style.height = "90vh";
          drawerContent.style.maxHeight = "90vh";
        }
        prevVisualViewportRef.current = 0;
        initialViewportHeightRef.current = 0;
      }, 150);
    };

    searchInput.addEventListener("focus", handleFocus);
    searchInput.addEventListener("blur", handleBlur);

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportResize);
    }

    return () => {
      searchInput.removeEventListener("focus", handleFocus);
      searchInput.removeEventListener("blur", handleBlur);
      if (typeof window !== "undefined" && window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportResize);
      }
    };
  }, []);

  // 필터링된 제품 목록
  const filteredProducts = products.filter(product =>
    product.product_name.replace(/\s+/g, "").toLowerCase().includes(searchTerm.trim().replace(/\s+/g, "").toLowerCase())
  );

  // 제품별 현재 재고 계산
  const getCurrentStock = useCallback(
    (productOptionId: string) => {
      return stockCalculator.getCurrentStock(productOptionId, inventories, selectedLocationId);
    },
    [inventories, selectedLocationId]
  );

  // 제품 클릭 핸들러
  const handleProductClick = useCallback(
    (product: ProductOptionView) => {
      setSelectedProduct(product);
      const existing = selectedProducts.find(p => p.product_option_id === product.product_option_id);
      let initialQty = 0;

      if (existing) {
        initialQty = existing.quantity ?? 0;
      } else {
        if (allowNegative) {
          initialQty = getCurrentStock(product.product_option_id);
        } else {
          initialQty = 0;
        }
      }

      setCurrentQuantity(initialQty);
      setInitialQuantity(initialQty);
      setQuantityDialogOpen(true);
    },
    [selectedProducts, allowNegative, getCurrentStock]
  );

  // 수량 확인 핸들러
  const handleQuantityConfirm = useCallback(
    (product: ProductOptionView, quantity: number) => {
      if (!allowNegative && !quantity) {
        setSelectedProducts(prev => prev.filter(p => p.product_option_id !== product.product_option_id));
        return;
      }

      setSelectedProducts(prev => {
        const existing = prev.find(p => p.product_option_id === product.product_option_id);
        if (existing) {
          return prev.map(p => (p.product_option_id === product.product_option_id ? { ...p, quantity } : p));
        }
        return [...prev, { ...product, quantity }];
      });
    },
    [allowNegative]
  );

  // 다이얼로그 열림/닫힘 핸들러
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCurrentQuantity(0);
      setTimeout(() => {
        const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
        if (drawerContent) {
          drawerContent.style.height = "90vh";
          drawerContent.style.maxHeight = "90vh";
        }
      }, 150);
    }
    setQuantityDialogOpen(open);
  }, []);

  // 선택 여부 확인
  const isSelected = useCallback(
    (productOptionId: string) => {
      return selectedProducts.some(p => p.product_option_id === productOptionId);
    },
    [selectedProducts]
  );

  // 선택된 수량 가져오기
  const getSelectedQuantity = useCallback(
    (productOptionId: string) => {
      const selected = selectedProducts.find(p => p.product_option_id === productOptionId);
      return selected ? selected.quantity ?? 0 : 0;
    },
    [selectedProducts]
  );

  return {
    // 상태
    searchTerm,
    setSearchTerm,
    selectedProducts,
    setSelectedProducts, // 외부에서 직접 수정 가능하도록
    quantityDialogOpen,
    selectedProduct,
    currentQuantity,
    setCurrentQuantity,
    initialQuantity,
    searchInputRef,
    // 계산된 값
    filteredProducts,
    getCurrentStock,
    isSelected,
    getSelectedQuantity,
    // 핸들러
    handleProductClick,
    handleQuantityConfirm,
    handleDialogOpenChange,
  };
}
