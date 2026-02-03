"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatStock } from "@/lib/domain/format";
import { isMaterialItem } from "@/lib/domain/inventory";
import { formatNumber } from "@/lib/utils";
import type { DomainInventoryItem } from "@/types/domain";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { useState, useMemo } from "react";
import Tab from "@/app/products/_components/Tab";
import ProductListItem from "./ProductListItem";
import ProductQuantityDialog from "./ProductQuantityDialog";
import WeightPickerDialog from "./WeightPickerDialog";
import { useProductSelection } from "../_hooks/useProductSelection";
import { useProductQuantityDialog } from "../_hooks/useProductQuantityDialog";

type FormType = "in" | "out" | "move" | "adjust";
type TabType = "product" | "material";

interface ProductSelectViewProps {
  onBack: () => void;
  onSelect: (products: DomainInventoryItem[]) => void;
  products: DomainInventoryItem[];
  allowNegative?: boolean;
  selectedLocationId?: string;
  initialSelectedProducts?: DomainInventoryItem[];
  formType?: FormType;
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
  formType = "in",
}: ProductSelectViewProps) {
  // 탭 상태 (입고/조정에서만 사용)
  const [selectedTab, setSelectedTab] = useState<TabType>("product");
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);

  // 탭 표시 여부 (모든 폼에서 탭 표시)
  const showTabs = true;

  // 원재료 존재 여부 확인
  const hasMaterials = useMemo(
    () => products.some(p => isMaterialItem(p)),
    [products]
  );

  // 탭에 따른 제품 필터링
  const tabFilteredProducts = useMemo(() => {
    if (!showTabs) return products;
    return products.filter(p =>
      selectedTab === "material"
        ? isMaterialItem(p)
        : !isMaterialItem(p)
    );
  }, [products, selectedTab, showTabs]);

  const productSelection = useProductSelection({
    products: tabFilteredProducts,
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

  // 선택된 제품이 원재료인지 확인
  const isMaterialProduct = selectedProduct ? isMaterialItem(selectedProduct) : false;

  // 원재료 선택 시 WeightPickerDialog 열기
  const handleProductItemClick = (product: DomainInventoryItem) => {
    handleProductClick(product);
    if (isMaterialItem(product)) {
      setWeightDialogOpen(true);
    }
  };

  // 중량 선택 완료 핸들러
  const handleWeightConfirm = (product: DomainInventoryItem, weightInGrams: number) => {
    handleQuantityConfirm(product, weightInGrams);
    setWeightDialogOpen(false);
  };

  // onSelect 호출 시 selectedProducts 전달
  const handleSelectComplete = () => {
    onSelect(selectedProducts);
  };

  // 수량 다이얼로그 hook (완제품용)
  const quantityDialogHook = useProductQuantityDialog({
    open: quantityDialogOpen && !isMaterialProduct,
    product: selectedProduct,
    quantity: currentQuantity,
    setQuantity: setCurrentQuantity,
    allowNegative,
    selectedLocationId,
    initialQuantity,
    formType,
  });

  const handleConfirmClick = () => {
    quantityDialogHook.handleConfirm(handleQuantityConfirm, handleDialogOpenChange);
  };

  // 선택 요약 텍스트 생성
  const getSelectionSummary = (items: DomainInventoryItem[]) => {
    const finishedProducts = items.filter(p => !isMaterialItem(p));
    const materials = items.filter(p => isMaterialItem(p));
    
    const parts: string[] = [];
    
    if (finishedProducts.length > 0) {
      const totalQty = finishedProducts.reduce((acc, curr) => acc + (curr.quantity ?? 0), 0);
      parts.push(`완제품 ${formatNumber(totalQty)}개`);
    }
    
    if (materials.length > 0) {
      const totalWeight = materials.reduce((acc, curr) => acc + (curr.quantity ?? 0), 0);
      parts.push(`원재료 ${formatStock(totalWeight, "GRAM")}`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "0개 선택";
  };

  // 탭 아이템
  const tabItems = [
    { value: "product", label: "완제품" },
    { value: "material", label: "원재료" },
  ];

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

      {/* 탭 (입고/조정에서만, 원재료가 있을 때만) */}
      {showTabs && hasMaterials && (
        <div className="px-4 pt-2">
          <Tab
            items={tabItems}
            value={selectedTab}
            onValueChange={value => setSelectedTab(value as TabType)}
          />
        </div>
      )}

      {/* 제품 목록 */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-2">
          {filteredProducts.map(product => (
            <ProductListItem
              key={product.productOptionId}
              product={product}
              quantity={isSelected(product.productOptionId) ? getSelectedQuantity(product.productOptionId) : undefined}
              selected={isSelected(product.productOptionId)}
              onClick={() => handleProductItemClick(product)}
              currentStock={allowNegative && selectedLocationId ? getCurrentStock(product.productOptionId) : undefined}
            />
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">{getSelectionSummary(selectedProducts)}</span>
        </div>
        <Button
          className="w-full text-white bg-orange-500 hover:bg-orange-600"
          onClick={handleSelectComplete}
          disabled={selectedProducts.length === 0}
        >
          선택 완료
        </Button>
      </div>

      {/* 수량 선택 모달 (완제품용) */}
      {selectedProduct && !isMaterialProduct && (
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
          formType={formType}
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

      {/* 중량 선택 모달 (원재료용) */}
      {selectedProduct && isMaterialProduct && (
        <WeightPickerDialog
          open={weightDialogOpen}
          onOpenChange={open => {
            setWeightDialogOpen(open);
            if (!open) handleDialogOpenChange(false);
          }}
          product={selectedProduct}
          onConfirm={handleWeightConfirm}
          formType={formType === "in" || formType === "adjust" ? formType : "in"}
          currentStock={getCurrentStock(selectedProduct.productOptionId)}
        />
      )}
    </div>
  );
}
