"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils";
import type { ProductOptionView } from "@/types/database";
import { ArrowLeft, Filter, Search } from "lucide-react";
import ProductListItem from "./ProductListItem";
import ProductQuantityDialog from "./ProductQuantityDialog";
import { useProductSelection } from "../_hooks/useProductSelection";
import { useProductQuantityDialog } from "../_hooks/useProductQuantityDialog";

interface ProductSelectViewProps {
  onBack: () => void;
  onSelect: (products: ProductOptionView[]) => void;
  products: ProductOptionView[];
  allowNegative?: boolean;
  selectedLocationId?: string;
  initialSelectedProducts?: ProductOptionView[];
}

/**
 * 제품 선택 뷰 컴포넌트 (순수 UI)
 */
export default function ProductSelectView({
  onBack,
  onSelect,
  products,
  allowNegative = false,
  selectedLocationId,
  initialSelectedProducts = [],
}: ProductSelectViewProps) {
  const productSelection = useProductSelection({
    products,
    allowNegative,
    selectedLocationId,
    initialSelectedProducts,
  });

  const {
    searchTerm,
    setSearchTerm,
    selectedProducts,
    setSelectedProducts,
    quantityDialogOpen,
    selectedProduct,
    currentQuantity,
    setCurrentQuantity,
    initialQuantity,
    searchInputRef,
    filteredProducts,
    getCurrentStock,
    isSelected,
    getSelectedQuantity,
    handleProductClick,
    handleQuantityConfirm,
    handleDialogOpenChange,
  } = productSelection;

  // onSelect 호출 시 selectedProducts 전달
  const handleSelectComplete = () => {
    onSelect(selectedProducts);
  };

  // 수량 다이얼로그 hook
  const quantityDialogHook = useProductQuantityDialog({
    open: quantityDialogOpen,
    product: selectedProduct,
    quantity: currentQuantity,
    setQuantity: setCurrentQuantity,
    allowNegative,
    selectedLocationId,
    initialQuantity,
  });

  const handleConfirmClick = () => {
    quantityDialogHook.handleConfirm(handleQuantityConfirm, handleDialogOpenChange);
  };

  const getTotalQuantity = (products: ProductOptionView[]) => {
    return products.reduce((acc, curr) => acc + (curr.quantity ?? 0), 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">제품 선택</h2>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
          <Input
            ref={searchInputRef}
            placeholder="제품 이름, 바코드, 속성 검색"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 제품 목록 */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-2">
          {filteredProducts.map(product => (
            <ProductListItem
              key={product.product_option_id}
              product={product}
              quantity={isSelected(product.product_option_id) ? getSelectedQuantity(product.product_option_id) : undefined}
              selected={isSelected(product.product_option_id)}
              onClick={() => handleProductClick(product)}
              currentStock={allowNegative && selectedLocationId ? getCurrentStock(product.product_option_id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">총 {formatNumber(getTotalQuantity(selectedProducts))}개 선택</span>
        </div>
        <Button
          className="w-full text-white bg-orange-500 hover:bg-orange-600"
          onClick={handleSelectComplete}
          disabled={selectedProducts.length === 0}
        >
          선택 완료
        </Button>
      </div>

      {/* 수량 선택 모달 */}
      {selectedProduct && (
        <ProductQuantityDialog
          quantity={currentQuantity}
          setQuantity={setCurrentQuantity}
          open={quantityDialogOpen}
          onOpenChange={handleDialogOpenChange}
          product={selectedProduct}
          onConfirm={handleConfirmClick}
          allowNegative={allowNegative}
          selectedLocationId={selectedLocationId}
          initialQuantity={initialQuantity}
          inputValue={quantityDialogHook.inputValue}
          currentStock={quantityDialogHook.currentStock}
          finalStock={quantityDialogHook.finalStock}
          displayStock={quantityDialogHook.displayStock}
          changeAmount={quantityDialogHook.changeAmount}
          handleQuantityChange={quantityDialogHook.handleQuantityChange}
          handleInputChange={quantityDialogHook.handleInputChange}
          handleInputBlur={quantityDialogHook.handleInputBlur}
        />
      )}
    </div>
  );
}
