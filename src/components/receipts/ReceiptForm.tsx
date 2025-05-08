"use client";

import { useReceipt } from "@/contexts/ReceiptContext";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import DrawerView from "../ui/drawer-view";
import ManageView from "./ManageView";
import ProductSelectView from "./ProductSelectView";
import { useLocations } from "@/hooks/useLocations";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import ProductListItem from "./ProductListItem";
import { Product } from "@/types/product";

export default function ReceiptForm({ mode }: { mode: "IN" | "OUT" }) {
  const { formData } = useReceipt();
  const [isLocationViewVisible, setIsLocationViewVisible] = useState(false);
  const [isSupplierViewVisible, setIsSupplierViewVisible] = useState(false);
  const [isProductViewVisible, setIsProductViewVisible] = useState(false);
  const [isMemoViewVisible, setIsMemoViewVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const { locations, addLocation, editLocation, deleteLocation } = useLocations();
  const { suppliers, addSupplier, editSupplier, deleteSupplier } = useSuppliers();
  const { products } = useProducts();

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setIsLocationViewVisible(false);
  };

  const handleSupplierSelect = (supplier: string) => {
    setSelectedSupplier(supplier);
    setIsSupplierViewVisible(false);
  };

  const handleProductSelect = (list: Product[]) => {
    setSelectedProducts(list);
    setIsProductViewVisible(false);
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* 입고/출고 정보 */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <Button
            onClick={() => setIsLocationViewVisible(true)}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">위치</h3>
              <p className="text-sm text-gray-500">{selectedLocation || "선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsSupplierViewVisible(true)}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
            size="none"
          >
            <div className="flex justify-between w-full">
              <h3 className="font-medium">{mode === "IN" ? "입고처" : "출고처"}</h3>
              <p className="text-sm text-gray-500">{selectedSupplier || "선택"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>

          <Button
            onClick={() => setIsProductViewVisible(true)}
            variant="ghost"
            className="flex items-center justify-between w-full py-2"
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
                <ProductListItem key={product.id} product={product} selected={false} />
              ))}
            </div>
          )}

          <Button variant="ghost" className="flex items-center justify-between w-full py-2" size="none">
            <div className="flex justify-between w-full">
              <h3 className="font-medium">메모</h3>
              <p className="text-sm text-gray-500">{formData.memo || "작성"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            임시 저장
          </Button>
          <Button className={`flex-1 ${mode === "IN" ? "bg-orange-200 text-gray-800" : "bg-red-500 text-white hover:bg-red-600"}`}>
            {mode === "IN" ? "입고" : "출고"} 완료
          </Button>
        </div>
      </div>

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
          title={mode === "IN" ? "입고처 선택" : "출고처 선택"}
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
    </div>
  );
}
