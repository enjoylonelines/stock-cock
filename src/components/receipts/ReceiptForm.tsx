"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import DrawerView from "../ui/drawer-view";
import ManageView from "./ManageView";
import ProductSelectView from "./ProductSelectView";
import { useLocations } from "@/hooks/useWarehouses";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import ProductListItem from "./ProductListItem";
import MemoView from "./MemoView";
import DatePickerDialog from "./DatePickerDialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { ProductOptionView } from "@/types/product_option_view";
import { useUser } from "@/contexts/UserContext";

export default function ReceiptForm({ mode, closeDrawer }: { mode: "in" | "out"; closeDrawer: () => void }) {
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isSupplierViewVisible, setIsSupplierViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<ProductOptionView[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products } = useProducts();
  const router = useRouter();
  const user = useUser();

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setSelectedLocation(location.id);
    setIsLocationViewVisible(false);
  };

  const handleSupplierSelect = (supplier: { id: string; name: string }) => {
    setSelectedSupplier(supplier.id);
    setIsSupplierViewVisible(false);
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
    if (!selectedLocation || !selectedSupplier || selectedProducts.length === 0) {
      alert("위치, 공급처, 제품을 모두 선택해주세요.");
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: mode,
          warehouse_id: selectedLocation,
          supplier_id: selectedSupplier,
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
        throw new Error("입고 처리 중 오류가 발생했습니다.");
      }

      // 성공 시 폼 초기화
      setSelectedLocation("");
      setSelectedSupplier("");
      setSelectedProducts([]);
      setMemo("");
      setSelectedDate(new Date());
      closeDrawer();

      // /inventory로 replace
      router.replace("/inventory");
    } catch (error) {
      console.error("Error submitting receipt:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex relative flex-col h-full">
      {/* 입고/출고 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            onClick={() => setIsDatePickerVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">날짜</h3>
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
            onClick={() => setIsSupplierViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">{mode === "in" ? "입고처" : "출고처"}</h3>
              <p className="text-sm text-gray-500">{suppliers.find((sup) => sup.id === selectedSupplier)?.name || "선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsProductViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">제품</h3>
              <p className="text-sm text-gray-500">{selectedProducts.length}개 품목</p>
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
        <div className="flex gap-2">
          {/* <Button variant="outline" className="flex-1">
            임시 저장
          </Button> */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 ${
              mode === "in"
                ? "bg-blue-300 hover:bg-blue-500 active:bg-blue-500 text-gray-800"
                : "bg-red-300 text-white hover:bg-red-500 active:bg-red-500"
            }`}
          >
            {isLoading ? "처리 중..." : mode === "in" ? "입고완료" : "출고완료"}
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

      {/* 위치 관리 드로어 */}
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

      {/* 공급처 관리 드로어 */}
      <DrawerView isVisible={isSupplierViewVisible}>
        <ManageView
          onBack={() => setIsSupplierViewVisible(false)}
          onSelect={handleSupplierSelect}
          title={mode === "in" ? "입고처 선택" : "출고처 선택"}
          items={suppliers}
          onAdd={addSupplier}
          onEdit={editSupplier}
          onDelete={deleteSupplier}
        />
      </DrawerView>

      {/* 제품 선택 드로어 */}
      <DrawerView isVisible={isProductViewVisible}>
        <ProductSelectView products={products} onBack={() => setIsProductViewVisible(false)} onSelect={handleProductSelect} />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView value={memo} onChange={setMemo} onBack={() => setIsMemoViewVisible(false)} onDone={handleMemoDone} />
      </DrawerView>
    </div>
  );
}
