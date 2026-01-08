"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useFormStateStore } from "@/store/formStateStore";
import type { ProductOptionView } from "@/types/product_option_view";
import { clientLogger } from "@/utils/client-logger";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import DrawerView from "../ui/drawer-view";
import DatePickerDialog from "./DatePickerDialog";
import ManageView from "./ManageView";
import MemoView from "./MemoView";
import ProductSelectView from "./ProductSelectView";
import { ReceiptFormFields } from "./ReceiptFormFields";

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

  // 필수 필드 검증: 위치(입고처/출고처), 거래처, 제품이 모두 선택되어야 활성화 - 메모이제이션
  const isFormValid = useMemo(
    () => selectedLocation && selectedSupplier && selectedProducts.length > 0,
    [selectedLocation, selectedSupplier, selectedProducts.length]
  );

  // 선택된 창고 이름 - 메모이제이션
  const selectedWarehouseName = useMemo(
    () => warehouses.find(loc => loc.id === selectedLocation)?.name || "선택",
    [warehouses, selectedLocation]
  );

  // 선택된 거래처 이름 - 메모이제이션
  const selectedSupplierName = useMemo(
    () => suppliers.find(sup => sup.id === selectedSupplier)?.name || "선택",
    [suppliers, selectedSupplier]
  );

  // 날짜 포맷팅 - 메모이제이션
  const formattedDate = useMemo(() => format(selectedDate, "yyyy년 MM월 dd일", { locale: ko }), [selectedDate]);

  const handleWarehouseSelect = useCallback(
    (warehouse: { id: string; name: string }) => {
      updateReceiptForm(mode, { selectedLocation: warehouse.id });
      setIsWarehouseViewVisible(false);
    },
    [mode, updateReceiptForm]
  );

  const handleSupplierSelect = useCallback(
    (supplier: { id: string; name: string }) => {
      updateReceiptForm(mode, { selectedSupplier: supplier.id });
      setIsSupplierViewVisible(false);
    },
    [mode, updateReceiptForm]
  );

  const handleProductSelect = useCallback(
    (list: ProductOptionView[]) => {
      updateReceiptForm(mode, { selectedProducts: list });
      setIsProductViewVisible(false);
    },
    [mode, updateReceiptForm]
  );

  const handleMemoDone = useCallback(() => {
    setIsMemoViewVisible(false);
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      updateReceiptForm(mode, { selectedDate: date });
    },
    [mode, updateReceiptForm]
  );

  const handleSubmit = useCallback(async () => {
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
      clientLogger.error("입고/출고 처리 실패", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedLocation,
    selectedSupplier,
    selectedProducts,
    memo,
    mode,
    user?.id,
    selectedDate,
    resetReceiptForm,
    closeDrawer,
    router,
  ]);

  return (
    <div className="flex relative flex-col h-full">
      {/* 입고/출고 정보 */}
      <div className="flex-1 p-4">
        <ReceiptFormFields
          formattedDate={formattedDate}
          selectedWarehouseName={selectedWarehouseName}
          selectedSupplierName={selectedSupplierName}
          selectedProducts={selectedProducts}
          memo={memo}
          mode={mode}
          onDateClick={() => setIsDatePickerVisible(true)}
          onWarehouseClick={() => setIsWarehouseViewVisible(true)}
          onSupplierClick={() => setIsSupplierViewVisible(true)}
          onProductClick={() => setIsProductViewVisible(true)}
          onMemoClick={() => setIsMemoViewVisible(true)}
        />
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
