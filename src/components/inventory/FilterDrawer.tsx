"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import DrawerView from "../ui/drawer-view";
import ManageView from "../receipts/ManageView";
import { useLocations } from "@/hooks/useWarehouses";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import DatePickerDialog from "../receipts/DatePickerDialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FilterState, TransactionType } from "@/store/filterDrawer";

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

  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType>(initialFilters?.transactionType || "전체");
  const [startDate, setStartDate] = useState<Date | null>(initialFilters?.startDate || null);
  const [endDate, setEndDate] = useState<Date | null>(initialFilters?.endDate || null);
  const [selectedLocation, setSelectedLocation] = useState<string>(initialFilters?.location || "");
  const [selectedProduct, setSelectedProduct] = useState<string>(initialFilters?.product || "");
  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialFilters?.supplier || "");
  const [selectedMember, setSelectedMember] = useState<string>(initialFilters?.member || "");

  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products } = useProducts();

  const transactionTypes: TransactionType[] = ["전체", "입고", "출고", "조정", "이동"];

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setSelectedLocation(location.id);
    setIsLocationViewVisible(false);
  };

  const handleProductSelect = (product: { product_option_id: string; product_name: string }) => {
    setSelectedProduct(product.product_option_id);
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90vh] flex flex-col" role="dialog" aria-modal="true">
        <DrawerHeader className="flex-shrink-0 py-0">
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" className="flex justify-end w-8 h-8" onClick={onClose} aria-label="닫기">
              <X className="size-7" />
            </Button>
          </div>

          <div className="flex justify-between items-center py-2 border-b-2 border-blue-400">
            <div>
              <DrawerTitle className="text-lg font-medium text-blue-400">필터</DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">재고 변동 내역을 필터링합니다.</DrawerDescription>
            </div>
            <Button variant="ghost" onClick={handleReset}>
              초기화
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
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
                <span className="text-gray-500">{startDate ? format(startDate, "yyyy.MM.dd", { locale: ko }) : "선택"}</span>
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
                {selectedLocation ? locations.find((loc) => loc.id === selectedLocation)?.name : "전체"}
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
                {selectedProduct ? products.find((prod) => prod.product_option_id === selectedProduct)?.product_name : "전체"}
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
                {selectedSupplier ? suppliers.find((sup) => sup.id === selectedSupplier)?.name : "전체"}
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
              <span className="text-gray-500">{selectedMember ? "선택된 멤버" : "전체"}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t">
          <Button className="w-full h-12 text-lg font-semibold text-white bg-blue-500 hover:bg-blue-600" onClick={handleApplyFilter}>
            필터 적용
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
            items={locations}
            onAdd={addLocation}
            onEdit={editLocation}
            onDelete={deleteLocation}
          />
        </DrawerView>

        {/* 제품 선택 드로어 */}
        <DrawerView isVisible={isProductViewVisible}>
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center px-4 py-3 border-b">
              <Button variant="ghost" size="icon" onClick={closeDrawer}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="ml-2 text-lg font-semibold">제품 선택</h2>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    setSelectedProduct("");
                    closeDrawer();
                  }}
                >
                  전체
                </Button>
                {products.map((product) => (
                  <Button
                    key={product.product_option_id}
                    variant="ghost"
                    className="justify-start w-full"
                    onClick={() => handleProductSelect(product)}
                  >
                    {product.product_name} {product.weight}g
                  </Button>
                ))}
              </div>
            </div>
          </div>
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
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center px-4 py-3 border-b">
              <Button variant="ghost" size="icon" onClick={closeDrawer}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="ml-2 text-lg font-semibold">멤버 선택</h2>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    setSelectedMember("");
                    closeDrawer();
                  }}
                >
                  전체
                </Button>
                {/* 멤버 목록은 실제 데이터에 따라 구현 */}
                <Button variant="ghost" className="justify-start w-full" onClick={() => handleMemberSelect({ id: "1", name: "사용자 1" })}>
                  사용자 1
                </Button>
              </div>
            </div>
          </div>
        </DrawerView>
      </DrawerContent>
    </Drawer>
  );
}
