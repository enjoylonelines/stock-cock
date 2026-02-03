"use client";

import { Button } from "@/components/ui/button";
import DrawerView from "@/components/ui/drawer-view";
import { useInventories } from "@/hooks/useInventories";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useMemo, useState } from "react";
import { useTransactionForm } from "../_hooks/useTransactionForm";
import { transactionFormatter } from "../_lib/transaction-formatter";
import DatePickerDialog from "./DatePickerDialog";
import ManageView from "./ManageView";
import MemoView from "./MemoView";
import ProductSelectView from "./ProductSelectView";
import { TransactionFormFields } from "./TransactionFormFields";

interface TransactionFormProps {
  mode: "in" | "out";
  closeDrawer: () => void;
}

/**
 * 입출고 거래 폼 컴포넌트 (순수 UI)
 */
export default function TransactionForm({ mode, closeDrawer }: TransactionFormProps) {
  const [isWarehouseViewVisible, setIsWarehouseViewVisible] = useState(false);
  const [isSupplierViewVisible, setIsSupplierViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products: allProducts } = useProducts();
  const { inventories } = useInventories();

  // 입고/출고 모두 원재료 포함
  const products = allProducts;

  const {
    isLoading,
    isFormValid,
    selectedLocation,
    selectedSupplier,
    selectedProducts,
    selectedDate,
    memo,
    updateTransactionForm,
    handleSubmit,
  } = useTransactionForm(mode, closeDrawer);

  // 선택된 창고 이름
  const selectedWarehouseName = useMemo(
    () => warehouses.find(loc => loc.id === selectedLocation)?.name || "선택",
    [warehouses, selectedLocation]
  );

  // 선택된 거래처 이름
  const selectedSupplierName = useMemo(
    () => suppliers.find(sup => sup.id === selectedSupplier)?.name || "선택",
    [suppliers, selectedSupplier]
  );

  // 날짜 포맷팅
  const formattedDate = useMemo(() => transactionFormatter.formatDate(selectedDate), [selectedDate]);

  // 출고 모드일 때 해당 위치에 재고가 있는지 확인
  const hasStockInLocation = useMemo(() => {
    if (mode !== "out" || !selectedLocation) return true;
    return inventories.some(
      inv => inv.warehouse_id === selectedLocation && ((inv.quantity ?? 0) > 0 || (inv.weight_in_grams ?? 0) > 0)
    );
  }, [mode, selectedLocation, inventories]);

  // 제품 버튼 상태
  const productButtonState = useMemo(() => {
    if (mode === "out") {
      if (!selectedLocation) {
        return { disabled: true, text: "위치를 먼저 선택해주세요" };
      }
      if (!hasStockInLocation) {
        return { disabled: true, text: "재고가 없습니다" };
      }
    }
    return { disabled: false, text: undefined };
  }, [mode, selectedLocation, hasStockInLocation]);

  const handleWarehouseSelect = (warehouse: { id: string; name: string }) => {
    updateTransactionForm({ selectedLocation: warehouse.id });
    setIsWarehouseViewVisible(false);
  };

  const handleSupplierSelect = (supplier: { id: string; name: string }) => {
    updateTransactionForm({ selectedSupplier: supplier.id });
    setIsSupplierViewVisible(false);
  };

  const handleProductSelect = (list: typeof selectedProducts) => {
    updateTransactionForm({ selectedProducts: list });
    setIsProductViewVisible(false);
  };

  const handleMemoDone = () => {
    setIsMemoViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    updateTransactionForm({ selectedDate: date });
  };

  return (
    <div className="flex relative flex-col h-full">
      {/* 입고/출고 정보 */}
      <div className="flex-1 p-4">
        <TransactionFormFields
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
          productDisabled={productButtonState.disabled}
          productStatusText={productButtonState.text}
        />
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 pb-8 border-t">
        <div className="flex gap-2">
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
          formType={mode}
        />
      </DrawerView>

      {/* 메모 입력 드로어 */}
      <DrawerView isVisible={isMemoViewVisible}>
        <MemoView
          value={memo}
          onChange={value => updateTransactionForm({ memo: value })}
          onBack={() => setIsMemoViewVisible(false)}
          onDone={handleMemoDone}
        />
      </DrawerView>
    </div>
  );
}
