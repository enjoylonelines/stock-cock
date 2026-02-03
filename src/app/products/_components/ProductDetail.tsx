"use client";

import InventoryList from "@/app/inventory/_components/InventoryList";
import { Button } from "@/components/ui/button";
import { useInventories } from "@/hooks/useInventories";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";
import { useWarehouses } from "@/hooks/useWarehouses";
import { formatBoxBreakdown, formatStock } from "@/lib/domain/format";
import { isMaterialItem } from "@/lib/domain/inventory";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import { useDrawerStore } from "@/store/drawerStore";
import { useFormStateStore } from "@/store/formStateStore";
import type { DomainInventoryItem } from "@/types/domain";
import { clientLogger } from "@/utils/client-logger";
import { Edit } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProductDetailProps {
  product: DomainInventoryItem;
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const supabase = createClient();
  const { inventories } = useInventories();
  const { warehouses } = useWarehouses();
  const { grouped } = useInventoryHistory();
  const [showOnlyStocked, setShowOnlyStocked] = useState(false);
  const { openDrawer } = useDrawerStore();
  const { updateProductForm, resetProductForm } = useFormStateStore();

  const isMaterial = isMaterialItem(product);

  const getTotalStock = (productOptionId: string) => {
    const productInventories = inventories.filter((i) => i.product_option_id === productOptionId);

    if (isMaterial) {
      return productInventories.reduce((sum, i) => sum + (i.weight_in_grams ?? 0), 0);
    }
    return productInventories.reduce((sum, i) => sum + (typeof i.quantity === "number" ? i.quantity : 0), 0);
  };

  const normalizeQuantity = (inv: (typeof inventories)[0]) => {
    if (isMaterial) {
      return inv.weight_in_grams ?? 0;
    }
    return typeof inv.quantity === "number" ? inv.quantity : 0;
  };

  const totalStock = getTotalStock(product.productOptionId);
  const totalBoxSummary = isMaterial ? null : formatBoxBreakdown(totalStock, product.boxUnit);
  const getLocationName = (locationId: string) => warehouses.find((loc) => loc.id === locationId)?.name || "알 수 없음";

  const productInventories = inventories.filter((i) => i.product_option_id === product.productOptionId);
  const filteredInventories = showOnlyStocked ? productInventories.filter((inv) => normalizeQuantity(inv) > 0) : productInventories;

  // 특정 제품의 재고 변동 내역만 필터링
  const productHistory = grouped
    .map((group) => ({
      ...group,
      transactions: group.transactions.filter((tx) => (tx as { product_option_id?: string }).product_option_id === product.productOptionId),
    }))
    .filter((group) => group.transactions.length > 0);

  const handleEdit = async () => {
    try {
      // products 테이블에서 brand_id, category_id, product_type 가져오기
      const { data: productData, error } = await supabase
        .from("products")
        .select("category_id, brand_id, product_type, image_url")
        .eq("id", product.productId)
        .single();

      if (error) {
        alert("제품 정보를 불러오는데 실패했습니다.");
        return;
      }

      // DB: weight는 항상 g, unitLabel은 규격 표시용(kg/g)
      const weightUnit: "g" | "kg" = (product.unitLabel === "kg" ? "kg" : "g") as "g" | "kg";

      // formStateStore에 제품 데이터 로드
      resetProductForm(); // 먼저 초기화
      updateProductForm({
        name: product.name,
        categoryId: productData.category_id,
        brandId: productData.brand_id,
        productType: (productData.product_type as "company" | "franchise" | "pb") || "company",
        weight: product.weight,
        weightUnit,
        boxUnit: product.boxUnit ? product.boxUnit.toString() : "",
        sku: product.sku ?? undefined,
        imagePath: product.imageUrl || "",
        localPreviewUrl: product.imageUrl || "",
        editingProductId: product.productId,
        editingProductOptionId: product.productOptionId,
      });

      // 수정 모드로 드로어 열기
      openDrawer("product-edit");
    } catch (error) {
      clientLogger.error("제품 수정 오류", error);
      alert("제품 정보를 불러오는데 실패했습니다.");
    }
  };

  return (
    <div className="flex flex-col mx-auto max-w-3xl h-full bg-gray-50">
      {/* 상품 정보 */}
      <div className="flex-1 p-4 space-y-4">
        {/* 기본 정보 카드 */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex gap-4">
            <div className="overflow-hidden relative w-24 h-24 bg-gray-100 rounded-lg shrink-0">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority sizes="96px" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex gap-2 items-center">
                    <h2 className="text-lg font-semibold">{product.name}</h2>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleEdit}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">{""}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-500">{formatStock(totalStock, product.stockUnit)}</div>
                  {totalBoxSummary && <p className="mt-1 text-xs text-gray-500">{totalBoxSummary}</p>}
                </div>
              </div>
              <div className="flex flex-wrap mt-2 text-sm text-gray-600">
                <span>{product.categoryName}</span>
                <span className="mx-1">·</span>
                <span>{product.brandName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 위치별 재고 현황 */}
        <div className="p-4 bg-white rounded-lg">
          <h3 className="flex justify-between items-center mb-4 text-lg font-semibold">
            <span>{productInventories.length}개 위치</span>
            <div className="flex gap-2 items-center">
              <span className="text-sm font-normal text-gray-500">재고 보유</span>
              <button
                type="button"
                className={`w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${
                  showOnlyStocked ? "bg-blue-500" : "bg-gray-200"
                }`}
                onClick={() => setShowOnlyStocked((prev) => !prev)}
                aria-pressed={showOnlyStocked}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    showOnlyStocked ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </h3>
          <div className="space-y-2">
            {filteredInventories.length === 0 ? (
              <div className="text-sm text-gray-400">재고 없음</div>
            ) : (
              filteredInventories.map((inv) => {
                const locationQuantity = normalizeQuantity(inv);
                const boxSummary = isMaterial ? null : formatBoxBreakdown(locationQuantity, product.boxUnit);

                return (
                  <div key={inv.id} className="flex justify-between items-center p-4 w-full text-left">
                    <div className="flex gap-2 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>{getLocationName(inv.warehouse_id ?? "")}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-blue-500">{formatStock(locationQuantity, product.stockUnit)}</span>
                      {boxSummary && <span className="text-xs text-gray-500">{boxSummary}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 재고 변동 내역 */}
        <div className="p-4 bg-white rounded-lg">
          <h3 className="mb-4 text-lg font-semibold">재고 변동 내역</h3>
          {productHistory.length === 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-500">아직 재고 변동 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <InventoryList grouped={productHistory} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
