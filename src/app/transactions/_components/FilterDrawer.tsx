"use client";

import { useProfiles } from "@/app/transactions/_hooks/useProfiles";
import DatePickerDialog from "@/app/transaction-form/_components/DatePickerDialog";
import ManageView from "@/app/transaction-form/_components/ManageView";
import BaseFilterDrawer from "@/components/ui/BaseFilterDrawer";
import { Button } from "@/components/ui/button";
import DrawerView from "@/components/ui/drawer-view";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { FilterState, TransactionType } from "@/store/TransactionFilterDrawer";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export default function FilterDrawer({ isOpen, onClose, onApplyFilter, initialFilters }: FilterDrawerProps) {
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isSupplierViewVisible, setIsSupplierViewVisible] = useState(false);
  const [isMemberViewVisible, setIsMemberViewVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType>(
    initialFilters?.transactionType || "전체"
  );
  const [startDate, setStartDate] = useState<Date | null>(initialFilters?.startDate || null);
  const [endDate, setEndDate] = useState<Date | null>(initialFilters?.endDate || null);
  const [selectedLocation, setSelectedLocation] = useState<string>(initialFilters?.location || "");
  const [selectedProduct, setSelectedProduct] = useState<string>(initialFilters?.product || "");
  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialFilters?.supplier || "");
  const [selectedMember, setSelectedMember] = useState<string>(initialFilters?.member || "");

  const { warehouses, addWarehouse, editWarehouse, deleteWarehouse } = useWarehouses();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products } = useProducts();
  const { profiles, addProfile, editProfile, deleteProfile } = useProfiles();

  const transactionTypes: TransactionType[] = ["전체", "입고", "출고", "조정", "이동"];

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setSelectedLocation(location.id);
    setIsLocationViewVisible(false);
  };

  const handleProductSelect = (item: { id: string; name: string }) => {
    setSelectedProduct(item.id);
    setIsProductViewVisible(false);
  };

  const handleSupplierSelect = (supplier: { id: string; name: string }) => {
    setSelectedSupplier(supplier.id);
    setIsSupplierViewVisible(false);
  };

  const handleMemberSelect = (member: { id: string; name: string }) => {
    setSelectedMember(member.id);
    setIsMemberViewVisible(false);
  };

  const handleDateSelect = (date: Date) => {
    if (!startDate) {
      setStartDate(date);
    } else if (!endDate) {
      setEndDate(date);
    }
    setIsDatePickerVisible(false);
  };

  const handleReset = () => {
    setSelectedTransactionType("전체");
    setStartDate(null);
    setEndDate(null);
    setSelectedLocation("");
    setSelectedProduct("");
    setSelectedSupplier("");
    setSelectedMember("");
  };

  const handleApplyFilter = () => {
    const filters: FilterState = {
      transactionType: selectedTransactionType,
      startDate,
      endDate,
      location: selectedLocation,
      product: selectedProduct,
      supplier: selectedSupplier,
      member: selectedMember,
    };

    onApplyFilter(filters);

    onClose();
  };

  const closeDrawer = () => {
    setIsLocationViewVisible(false);
    setIsProductViewVisible(false);
    setIsSupplierViewVisible(false);
    setIsMemberViewVisible(false);
    setIsDatePickerVisible(false);
  };

  return (
    <BaseFilterDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApplyFilter={handleApplyFilter}
      onReset={handleReset}
      title="필터"
      description="재고 변동 내역을 필터링합니다."
    >
      {/* 거래 종류 */}
      <div className="space-y-3">
        <h3 className="font-medium">거래 종류</h3>
        <div className="flex gap-2">
          {transactionTypes.map((type: TransactionType) => (
            <Button
              key={type}
              variant={selectedTransactionType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTransactionType(type)}
              className={selectedTransactionType === type ? "bg-blue-500 text-white" : ""}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* 기간 */}
      <div className="space-y-3">
        <h3 className="font-medium">기간</h3>
        <div className="flex gap-2 items-center">
          <Button variant="outline" className="flex-1 justify-between" onClick={() => setIsDatePickerVisible(true)}>
            <span className="text-gray-500">
              {startDate ? format(startDate, "yyyy.MM.dd", { locale: ko }) : "선택"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-gray-400">-</span>
          <Button variant="outline" className="flex-1 justify-between" onClick={() => setIsDatePickerVisible(true)}>
            <span className="text-gray-500">{endDate ? format(endDate, "yyyy.MM.dd", { locale: ko }) : "선택"}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 위치 */}
      <div className="space-y-3">
        <h3 className="font-medium">위치</h3>
        <Button
          variant="ghost"
          className="flex justify-between items-center py-2 w-full"
          size="none"
          onClick={() => setIsLocationViewVisible(true)}
        >
          <span className="text-gray-500">
            {selectedLocation ? warehouses.find(loc => loc.id === selectedLocation)?.name : "전체"}
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* 제품 */}
      <div className="space-y-3">
        <h3 className="font-medium">제품</h3>
        <Button
          variant="ghost"
          className="flex justify-between items-center py-2 w-full"
          size="none"
          onClick={() => setIsProductViewVisible(true)}
        >
          <span className="text-gray-500">
            {selectedProduct ? products.find(prod => prod.productOptionId === selectedProduct)?.name : "전체"}
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* 거래처 */}
      <div className="space-y-3">
        <h3 className="font-medium">거래처</h3>
        <Button
          variant="ghost"
          className="flex justify-between items-center py-2 w-full"
          size="none"
          onClick={() => setIsSupplierViewVisible(true)}
        >
          <span className="text-gray-500">
            {selectedSupplier ? suppliers.find(sup => sup.id === selectedSupplier)?.name : "전체"}
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* 멤버 */}
      <div className="space-y-3">
        <h3 className="font-medium">멤버</h3>
        <Button
          variant="ghost"
          className="flex justify-between items-center py-2 w-full"
          size="none"
          onClick={() => setIsMemberViewVisible(true)}
        >
          <span className="text-gray-500">
            {selectedMember ? profiles.find(profile => profile.id === selectedMember)?.name : "전체"}
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* 날짜 선택 다이얼로그 */}
      <DatePickerDialog
        open={isDatePickerVisible}
        onOpenChange={setIsDatePickerVisible}
        selectedDate={startDate || new Date()}
        onSelect={handleDateSelect}
      />

      {/* 위치 선택 드로어 */}
      <DrawerView isVisible={isLocationViewVisible}>
        <ManageView
          onBack={closeDrawer}
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
        <ManageView
          onBack={closeDrawer}
          onSelect={handleProductSelect}
          title="제품 선택"
          items={products.map(product => ({
            id: product.productOptionId,
            name: product.name,
          }))}
        />
      </DrawerView>

      {/* 거래처 선택 드로어 */}
      <DrawerView isVisible={isSupplierViewVisible}>
        <ManageView
          onBack={closeDrawer}
          onSelect={handleSupplierSelect}
          title="거래처 선택"
          items={suppliers}
          onAdd={addSupplier}
          onEdit={editSupplier}
          onDelete={deleteSupplier}
        />
      </DrawerView>

      {/* 멤버 선택 드로어 */}
      <DrawerView isVisible={isMemberViewVisible}>
        <ManageView
          onBack={closeDrawer}
          onSelect={handleMemberSelect}
          title="멤버 선택"
          items={profiles}
          onAdd={addProfile}
          onEdit={editProfile}
          onDelete={deleteProfile}
        />
      </DrawerView>
    </BaseFilterDrawer>
  );
}
