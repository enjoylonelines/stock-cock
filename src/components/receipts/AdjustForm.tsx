"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import DrawerView from "../ui/drawer-view";
import ManageView from "./ManageView";
import ProductSelectView from "./ProductSelectView";
import { useLocations } from "@/hooks/useWarehouses";
import { useProducts } from "@/hooks/useProducts";
import ProductListItem from "./ProductListItem";
import MemoView from "./MemoView";
import DatePickerDialog from "./DatePickerDialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { ProductOptionView } from "@/types/product_option_view";
import { useUser } from "@/contexts/UserContext";

export default function AdjustForm({ closeDrawer }: { closeDrawer: () => void }) {
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<ProductOptionView[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { products } = useProducts();
  const router = useRouter();
  const user = useUser();

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setSelectedLocation(location.id);
    setIsLocationViewVisible(false);
  };

  const handleProductSelect = (list: ProductOptionView[]) => {
    setSelectedProducts(list);
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
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
          items: selectedProducts.map((product) => ({
            option_id: product.product_option_id,
            quantity: product.quantity || 1,
            unit_price: product.sell_price || null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("조정 처리 중 오류가 발생했습니다.");
      }

      // 성공 시 폼 초기화
      setSelectedLocation("");
      setSelectedProducts([]);
      setMemo("");
      setSelectedDate(new Date());
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
              <p className="text-sm text-gray-500">{locations.find((loc) => loc.id === selectedLocation)?.name || "선택"}</p>
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
              {selectedProducts.map((product) => (
                <ProductListItem key={product.product_option_id} product={product} quantity={product.quantity} selected={false} />
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
          items={locations}
          onAdd={addLocation}
          onEdit={editLocation}
          onDelete={deleteLocation}
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
        />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView value={memo} onChange={setMemo} onBack={() => setIsMemoViewVisible(false)} onDone={handleMemoDone} />
      </DrawerView>
    </div>
  );
}
