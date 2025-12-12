"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useInventories } from "@/hooks/useInventories";
import { useProducts } from "@/hooks/useProducts";
import { useLocations } from "@/hooks/useWarehouses";
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

export default function MoveForm({ closeDrawer }: { closeDrawer: () => void }) {
  const [isFromLocationViewVisible, setIsFromLocationViewVisible] = useState(false);
  const [isToLocationViewVisible, setIsToLocationViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { products } = useProducts();
  const { inventories } = useInventories();
  const router = useRouter();
  const user = useUser();
  const moveForm = useFormStateStore(state => state.moveForm);
  const updateMoveForm = useFormStateStore(state => state.updateMoveForm);
  const resetMoveForm = useFormStateStore(state => state.resetMoveForm);
  const { fromLocation, toLocation, selectedProducts, selectedDate, memo } = moveForm;

  const handleFromLocationSelect = (location: { id: string; name: string }) => {
    updateMoveForm({ fromLocation: location.id });
    setIsFromLocationViewVisible(false);
  };

  const handleToLocationSelect = (location: { id: string; name: string }) => {
    updateMoveForm({ toLocation: location.id });
    setIsToLocationViewVisible(false);
  };

  const handleProductSelect = (list: ProductOptionView[]) => {
    updateMoveForm({ selectedProducts: list });
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    updateMoveForm({ selectedDate: date });
  };

  const handleSubmit = async () => {
    if (!fromLocation || !toLocation || selectedProducts.length === 0) {
      alert("출발지, 도착지, 제품을 모두 선택해주세요.");
      return;
    }

    if (fromLocation === toLocation) {
      alert("출발지와 도착지는 다르게 선택해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/moves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_warehouse_id: fromLocation,
          to_warehouse_id: toLocation,
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
        throw new Error("이동 처리 중 오류가 발생했습니다.");
      }

      resetMoveForm();
      closeDrawer();

      // /inventory로 replace
      router.replace("/inventory");
    } catch (error) {
      console.error("Error submitting move:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemporarySave = () => {
    alert("입력 값은 드로어를 닫아도 유지됩니다.");
  };

  // 출발지에 재고가 있는 제품만 필터링
  const availableProducts = fromLocation
    ? products.filter(product => {
        const inventory = inventories.find(
          inv => inv.product_option_id === product.product_option_id && inv.warehouse_id === fromLocation
        );
        return inventory && inventory.quantity > 0;
      })
    : [];

  return (
    <div className="flex relative flex-col h-full">
      {/* 이동 정보 */}
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
            onClick={() => setIsFromLocationViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">From.</h3>
              <p className="text-sm text-gray-500">{locations.find(loc => loc.id === fromLocation)?.name || "선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsToLocationViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">To.</h3>
              <p className="text-sm text-gray-500">{locations.find(loc => loc.id === toLocation)?.name || "선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsProductViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
            disabled={!fromLocation || !toLocation || availableProducts.length === 0}
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품</h3>
              <p className="text-sm text-gray-500">
                {!fromLocation || !toLocation
                  ? "위치를 먼저 선택해주세요"
                  : fromLocation && availableProducts.length === 0
                    ? "재고가 없습니다"
                    : `${selectedProducts.length}개 품목`}
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
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleTemporarySave}>
            임시 저장
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 text-white bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? "처리 중..." : "이동 완료"}
          </Button>
        </div>
      </div>

      {/* 날짜 선택 다이얼로그 */}
      <DatePickerDialog
        open={isDatePickerVisible}
        onOpenChange={setIsDatePickerVisible}
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
      />

      {/* 출발지 선택 드로어 */}
      <DrawerView isVisible={isFromLocationViewVisible}>
        <ManageView
          onBack={() => setIsFromLocationViewVisible(false)}
          onSelect={handleFromLocationSelect}
          title="출발지 선택"
          items={locations.filter(loc => loc.id !== toLocation)}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
        />
      </DrawerView>

      {/* 도착지 선택 드로어 */}
      <DrawerView isVisible={isToLocationViewVisible}>
        <ManageView
          onBack={() => setIsToLocationViewVisible(false)}
          onSelect={handleToLocationSelect}
          title="도착지 선택"
          items={locations.filter(loc => loc.id !== fromLocation)}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
        />
      </DrawerView>

      {/* 제품 선택 드로어 */}
      <DrawerView isVisible={isProductViewVisible}>
        <ProductSelectView
          products={availableProducts}
          onBack={() => setIsProductViewVisible(false)}
          onSelect={handleProductSelect}
          initialSelectedProducts={selectedProducts}
        />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView
          value={memo}
          onChange={value => updateMoveForm({ memo: value })}
          onBack={() => setIsMemoViewVisible(false)}
          onDone={handleMemoDone}
        />
      </DrawerView>
    </div>
  );
}
