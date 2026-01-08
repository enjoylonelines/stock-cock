"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useFormStateStore } from "@/store/formStateStore";
import type { ProductOptionView } from "@/types/product_option_view";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DrawerView from "../ui/drawer-view";
import DatePickerDialog from "./DatePickerDialog";
import ManageView from "./ManageView";
import MemoView from "./MemoView";
import ProductListItem from "./ProductListItem";
import ProductSelectView from "./ProductSelectView";

export default function AdjustForm({ closeDrawer }: { closeDrawer: () => void }) {
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { products } = useProducts();
  const router = useRouter();
  const user = useUser();
  const adjustForm = useFormStateStore(state => state.adjustForm);
  const updateAdjustForm = useFormStateStore(state => state.updateAdjustForm);
  const resetAdjustForm = useFormStateStore(state => state.resetAdjustForm);
  const { selectedLocation, selectedProducts, selectedDate, memo } = adjustForm;

  const handleLocationSelect = (location: { id: string; name: string }) => {
    updateAdjustForm({ selectedLocation: location.id });
    setIsLocationViewVisible(false);
  };

  const handleProductSelect = (list: ProductOptionView[]) => {
    updateAdjustForm({ selectedProducts: list });
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    updateAdjustForm({ selectedDate: date });
  };

  const handleSubmit = async () => {
    if (!selectedLocation || selectedProducts.length === 0) {
      alert("위치, 제품을 모두 선택해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouse_id: selectedLocation,
          memo,
          user_id: user?.id,
          created_at: format(selectedDate, "yyyy-MM-dd HH:mm:ss"),
          items: selectedProducts.map(product => ({
            option_id: product.product_option_id,
            quantity: product.quantity || 1,
            unit_price: product.sell_price || null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("조정 처리 중 오류가 발생했습니다.");
      }

      resetAdjustForm();
      closeDrawer();

      // /inventory로 replace
      router.replace("/inventory");
    } catch (error) {
      console.error("Error submitting adjustment:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
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
              <p className="text-sm text-gray-500">{format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}</p>
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
            disabled={!selectedLocation}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품</h3>
              <p className="text-sm text-gray-500">
                {!selectedLocation ? "위치를 먼저 선택해주세요" : `${selectedProducts.length}개 품목`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          {/* 선택된 제품 리스트 */}
          {selectedProducts.length > 0 && (
            <div className="mt-2 space-y-2">
              {selectedProducts.map(product => (
                <ProductListItem
                  key={product.product_option_id}
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
          disabled={isLoading}
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
