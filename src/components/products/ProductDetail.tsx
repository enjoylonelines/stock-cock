"use client";

import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import { useInventories } from "@/hooks/useInventories";
import { useLocations } from "@/hooks/useWarehouses";
import { useState } from "react";
import { ProductOptionView } from "@/types/product_option_view";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";
import InventoryList from "@/components/inventory/InventoryList";

interface ProductDetailProps {
  product: ProductOptionView;
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const { inventories } = useInventories();
  const { locations } = useLocations();
  const { grouped } = useInventoryHistory();
  const [showOnlyStocked, setShowOnlyStocked] = useState(false);

  const getTotalStock = (productId: string) =>
    inventories
      .filter((i) => i.product_option_id === productId)
      .reduce((sum, i) => sum + (typeof i.quantity === "number" ? i.quantity : 0), 0);

  const getLocationName = (locationId: string) => locations.find((loc) => loc.id === locationId)?.name || "알 수 없음";

  const productInventories = inventories.filter((i) => i.product_option_id === product.product_option_id);
  const filteredInventories = showOnlyStocked
    ? productInventories.filter((inv) => (typeof inv.quantity === "number" ? inv.quantity : 0) > 0)
    : productInventories;

  // 특정 제품의 재고 변동 내역만 필터링
  const productHistory = grouped
    .map((group) => ({
      ...group,
      transactions: group.transactions.filter((tx) => tx.product_option_id === product.product_option_id),
    }))
    .filter((group) => group.transactions.length > 0);

  return (
    <div className="flex flex-col mx-auto max-w-3xl h-full bg-gray-50">
      {/* 상품 정보 */}
      <div className="flex-1 p-4 space-y-4">
        {/* 기본 정보 카드 */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex gap-4">
            <div className="overflow-hidden relative w-24 h-24 bg-gray-100 rounded-lg shrink-0">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  priority
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{product.product_name}</h2>
                  <p className="text-sm text-gray-500">{""}</p>
                </div>
                <div className="text-xl font-bold text-blue-500">{formatNumber(getTotalStock(product.product_option_id))}</div>
              </div>
              <div className="flex flex-wrap mt-2 text-sm text-gray-600">
                <span>{formatNumber(product.sell_price)}원</span>
                <span className="mx-1">·</span>
                <span>{formatNumber(product.buy_price)}원</span>
                <span className="mx-1">·</span>
                <span>{product.category_name}</span>
                <span className="mx-1">·</span>
                <span>{product.brand_name}</span>
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
              filteredInventories.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center p-4 w-full text-left">
                  <div className="flex gap-2 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span>{getLocationName(inv.warehouse_id)}</span>
                  </div>
                  <span className="text-blue-500">{formatNumber(inv.quantity)}</span>
                </div>
              ))
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
