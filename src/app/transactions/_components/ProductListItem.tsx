"use client";
import { formatMaterialSummary, formatSpecWeight, formatStock } from "@/lib/domain/format";
import { isMaterialItem } from "@/lib/domain/inventory";
import { formatNumber } from "@/lib/utils";
import type { DomainInventoryItem } from "@/types/domain";
import Image from "next/image";
import { memo } from "react";

interface ProductListItemProps {
  product: DomainInventoryItem;
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
  currentStock?: number; // 조정 모드에서 현재 재고 표시용
}

export const ProductListItem = memo(function ProductListItem({
  product,
  quantity,
  selected,
  onClick,
  currentStock,
}: ProductListItemProps) {
  const hasImage = product.imageUrl && product.imageUrl.trim() !== "";
  const isMaterial = isMaterialItem(product);

  // 원재료는 중량으로 표시, 완제품은 개수로 표시
  const formatQuantity = (qty: number) => {
    if (isMaterial) {
      // 0일 때는 "0"으로 표시
      if (qty === 0) return "0";
      return formatStock(qty, "GRAM");
    }
    return `${formatNumber(Math.abs(qty))}개`;
  };

  return (
    <button
      type="button"
      className={`w-full p-2 border rounded-lg text-left transition-colors flex gap-2 items-center bg-white shadow-md ${
        selected ? "bg-orange-50 border-orange-500" : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={onClick}
    >
      {/* 제품 이미지 */}
      <div className="flex overflow-hidden relative justify-center items-center w-12 h-12 bg-gray-100 rounded-lg shrink-0">
        {hasImage && product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" loading="lazy" sizes="48px" />
        ) : (
          <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* 제품 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {product.name}
              {product.weight > 0 && product.unitLabel && (
                <span className="ml-2 text-gray-500">{formatSpecWeight(product.weight, product.unitLabel)}</span>
              )}
            </h3>
          </div>
          <div className="text-center shrink-0">
            {quantity !== undefined ? (
              <div>
                <p
                  className={`text-sm font-medium ${
                    selected
                      ? quantity < 0
                        ? "text-red-500"
                        : "text-orange-500"
                      : quantity < 0
                        ? "text-red-500"
                        : "text-blue-500"
                  }`}
                >
                  {quantity < 0 ? "-" : ""}
                  {formatQuantity(quantity)}
                </p>
                {isMaterial && quantity !== 0 && (
                  <p className="text-xs text-gray-500">
                    {formatMaterialSummary(quantity, product.weight, product.unitLabel)}
                  </p>
                )}
              </div>
            ) : currentStock !== undefined ? (
              <div>
                <p className="text-sm text-gray-600">
                  현재:{" "}
                  {isMaterial
                    ? currentStock === 0
                      ? "0"
                      : formatStock(currentStock, "GRAM")
                    : `${formatNumber(currentStock)}개`}
                </p>
                {isMaterial && currentStock > 0 && (
                  <p className="text-xs text-gray-500">
                    {formatMaterialSummary(currentStock, product.weight, product.unitLabel)}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">{formatStock(product.stock, product.stockUnit)}</p>
                {isMaterial && product.stock > 0 && (
                  <p className="text-xs text-gray-500">
                    {formatMaterialSummary(product.stock, product.weight, product.unitLabel)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500">
          <span>{product.brandName}</span>
          <span>·</span>
          <span>{product.warehouseName}</span>
        </div>
      </div>
    </button>
  );
});

export default ProductListItem;
