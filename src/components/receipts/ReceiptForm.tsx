"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
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

export default function ReceiptForm({ mode, closeDrawer }: { mode: "in" | "out"; closeDrawer: () => void }) {
  const [isWarehouseViewVisible, setIsWarehouseViewVisible] = useState(false);
  const [isSupplierViewVisible, setIsSupplierViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products } = useProducts();
  const router = useRouter();
  const user = useUser();
  const receiptFormState = useFormStateStore(state => state.receiptForms[mode]);
  const updateReceiptForm = useFormStateStore(state => state.updateReceiptForm);
  const resetReceiptForm = useFormStateStore(state => state.resetReceiptForm);
  const { selectedLocation, selectedSupplier, selectedProducts, selectedDate, memo } = receiptFormState;

  // 필수 필드 검증: 위치(입고처/출고처), 거래처, 제품이 모두 선택되어야 활성화
  const isFormValid = selectedLocation && selectedSupplier && selectedProducts.length > 0;

  const handleWarehouseSelect = (warehouse: { id: string; name: string }) => {
    updateReceiptForm(mode, { selectedLocation: warehouse.id });
    setIsWarehouseViewVisible(false);
  };

  const handleSupplierSelect = (supplier: { id: string; name: string }) => {
    updateReceiptForm(mode, { selectedSupplier: supplier.id });
    setIsSupplierViewVisible(false);
  };

  const handleProductSelect = (list: ProductOptionView[]) => {
    updateReceiptForm(mode, { selectedProducts: list });
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    updateReceiptForm(mode, { selectedDate: date });
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !selectedSupplier || selectedProducts.length === 0) {
      alert(`${mode === "in" ? "입고처" : "출고처"}, 거래처, 제품을 모두 선택해주세요.`);
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
          items: selectedProducts.map(product => ({
            option_id: product.product_option_id,
            quantity: product.quantity || 1,
            unit_price: product.sell_price || null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("입고 처리 중 오류가 발생했습니다.");
      }

      resetReceiptForm(mode);
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
            onClick={() => setIsWarehouseViewVisible(true)}
            variant="ghost"
            className="flex justify-between items-center py-2 w-full"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">위치</h3>
              <p className="text-sm text-gray-500">
                {locations.find(loc => loc.id === selectedLocation)?.name || "선택"}
              </p>
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
              <h3 className="font-medium">거래처</h3>
              <p className="text-sm text-gray-500">
                {suppliers.find(sup => sup.id === selectedSupplier)?.name || "선택"}
              </p>
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
          {/* <Button variant="outline" className="flex-1">
            임시 저장
          </Button> */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid}
            className={`flex-1 ${
              isFormValid
                ? mode === "in"
                  ? "bg-blue-500 hover:bg-blue-600 active:bg-blue-600 text-white"
                  : "bg-red-500 text-white hover:bg-red-600 active:bg-red-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
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

      {/* 입고처/출고처 관리 드로어 */}
      <DrawerView isVisible={isWarehouseViewVisible}>
        <ManageView
          onBack={() => setIsWarehouseViewVisible(false)}
          onSelect={handleWarehouseSelect}
          title={mode === "in" ? "입고처 선택" : "출고처 선택"}
          items={warehouses}
          onAdd={addWarehouse}
          onEdit={editWarehouse}
          onDelete={deleteWarehouse}
        />
      </DrawerView>

      {/* 거래처 관리 드로어 */}
      <DrawerView isVisible={isSupplierViewVisible}>
        <ManageView
          onBack={() => setIsSupplierViewVisible(false)}
          onSelect={handleSupplierSelect}
          title="거래처 선택"
          items={suppliers}
          onAdd={addSupplier}
          onEdit={editSupplier}
          onDelete={deleteSupplier}
        />
      </DrawerView>

      {/* 제품 선택 드로어 */}
      <DrawerView isVisible={isProductViewVisible}>
        <ProductSelectView
          products={products}
          onBack={() => setIsProductViewVisible(false)}
          onSelect={handleProductSelect}
          initialSelectedProducts={selectedProducts}
        />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView
          value={memo}
          onChange={value => updateReceiptForm(mode, { memo: value })}
          onBack={() => setIsMemoViewVisible(false)}
          onDone={handleMemoDone}
        />
      </DrawerView>
    </div>
  );
}
