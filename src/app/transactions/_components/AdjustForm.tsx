"use client";

import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventories } from "@/hooks/useInventories";
import { transactionFormatter } from "../_lib/transaction-formatter";
import { useAdjustForm } from "../_hooks/useAdjustForm";
import DrawerView from "@/components/ui/drawer-view";
import DatePickerDialog from "./DatePickerDialog";
import ManageView from "./ManageView";
import MemoView from "./MemoView";
import ProductListItem from "./ProductListItem";
import ProductSelectView from "./ProductSelectView";
import { ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface AdjustFormProps {
  closeDrawer: () => void;
}

/**
 * 재고 조정 폼 컴포넌트 (순수 UI)
 */
export default function AdjustForm({ closeDrawer }: AdjustFormProps) {
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { products: allProducts } = useProducts();
  const { inventories } = useInventories();

  // 조정: 원재료 포함
  const products = allProducts;

  const {
    isLoading,
    isFormValid,
    selectedLocation,
    selectedProducts,
    selectedDate,
    memo,
    updateAdjustForm,
    handleSubmit,
  } = useAdjustForm(closeDrawer);

  // 날짜 포맷팅
  const formattedDate = useMemo(
    () => transactionFormatter.formatDate(selectedDate),
    [selectedDate]
  );

  // 해당 위치에 재고가 있는지 확인
  const hasStockInLocation = useMemo(() => {
    if (!selectedLocation) return true;
    return inventories.some(inv => 
      inv.warehouse_id === selectedLocation && 
      ((inv.quantity ?? 0) > 0 || (inv.weight_in_grams ?? 0) > 0)
    );
  }, [selectedLocation, inventories]);

  // 제품 버튼 상태
  const productButtonState = useMemo(() => {
    if (!selectedLocation) {
      return { disabled: true, text: "위치를 먼저 선택해주세요" };
    }
    if (!hasStockInLocation) {
      return { disabled: true, text: "재고가 없습니다" };
    }
    return { disabled: false, text: `${selectedProducts.length}개 품목` };
  }, [selectedLocation, hasStockInLocation, selectedProducts.length]);

  const handleLocationSelect = (location: { id: string; name: string }) => {
    updateAdjustForm({ selectedLocation: location.id });
    setIsLocationViewVisible(false);
  };

  const handleProductSelect = (list: typeof selectedProducts) => {
    updateAdjustForm({ selectedProducts: list });
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    updateAdjustForm({ selectedDate: date });
  };

  return (
    <div className="flex relative flex-col h-full">
      {/* 조정 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            onClick={() => setIsDatePickerVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">현재 시간</h3>
              <p className="text-sm text-gray-500">{formattedDate}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsLocationViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">위치</h3>
              <p className="text-sm text-gray-500">
                {warehouses.find(loc => loc.id === selectedLocation)?.name || "선택"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsProductViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
            disabled={productButtonState.disabled}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품</h3>
              <p className="text-sm text-gray-500">{productButtonState.text}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          {/* 선택된 제품 리스트 */}
          {selectedProducts.length > 0 && (
            <div className="mt-2 space-y-2">
              {selectedProducts.map(product => (
              <ProductListItem
                key={product.productOptionId}
                  product={product}
                  quantity={product.quantity}
                  selected={false}
                />
              ))}
            </div>
          )}

          <Button
            onClick={() => setIsMemoViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">메모</h3>
              <p className="text-sm text-gray-500">{memo || "작성"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 pb-8 border-t">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !isFormValid}
          className="w-full h-12 text-lg font-semibold text-white bg-green-500 hover:bg-green-600"
        >
          {isLoading ? "처리 중..." : "조정 완료"}
        </Button>
      </div>

      {/* 날짜 선택 다이얼로그 */}
      <DatePickerDialog
        open={isDatePickerVisible}
        onOpenChange={setIsDatePickerVisible}
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
      />

      {/* 위치 선택 드로어 */}
      <DrawerView isVisible={isLocationViewVisible}>
        <ManageView
          onBack={() => setIsLocationViewVisible(false)}
          onSelect={handleLocationSelect}
          title="위치 선택"
          items={warehouses}
          onAdd={addWarehouse}
          onEdit={editWarehouse}
          onDelete={deleteWarehouse}
        />
      </DrawerView>

      {/* 제품 선택 드로어 */}
      <DrawerView isVisible={isProductViewVisible}>
        <ProductSelectView
          products={products}
          onBack={() => setIsProductViewVisible(false)}
          onSelect={handleProductSelect}
          allowNegative={true}
          selectedLocationId={selectedLocation}
          initialSelectedProducts={selectedProducts}
          formType="adjust"
        />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView
          value={memo}
          onChange={value => updateAdjustForm({ memo: value })}
          onBack={() => setIsMemoViewVisible(false)}
          onDone={handleMemoDone}
        />
      </DrawerView>
    </div>
  );
}
