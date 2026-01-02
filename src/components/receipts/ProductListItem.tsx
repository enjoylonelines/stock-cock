"use client";
import { formatNumber, formatWeightDisplay } from "@/lib/utils";
import type { ProductOptionView } from "@/types/product_option_view";
import Image from "next/image";

interface ProductListItemProps {
  product: ProductOptionView;
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
  currentStock?: number; // 조정 모드에서 현재 재고 표시용
}

export default function ProductListItem({ product, quantity, selected, onClick, currentStock }: ProductListItemProps) {
  const hasImage = product.image_url && product.image_url.trim() !== "";

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
        {hasImage ? (
          <Image src={product.image_url} alt={product.product_name} fill className="object-cover" loading="lazy" sizes="48px" />
        ) : (
          <div className="flex justify-center items-center w-full h-full text-xs font-medium text-gray-400">
            {product.product_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* 제품 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {product.product_name}
              {product.weight > 0 && <span className="ml-2 text-gray-500">{formatWeightDisplay(product.weight)}</span>}
            </h3>
          </div>
          <div className="text-center shrink-0">
            {quantity !== undefined ? (
              <p
                className={`text-sm font-medium ${
                  selected ? (quantity < 0 ? "text-red-500" : "text-orange-500") : quantity < 0 ? "text-red-500" : "text-blue-500"
                }`}
              >
                {quantity < 0 ? "-" : ""}
                {formatNumber(Math.abs(quantity))}개
              </p>
            ) : currentStock !== undefined ? (
              <p className="text-sm text-gray-600">현재: {formatNumber(currentStock)}개</p>
            ) : (
              <p className="text-sm text-gray-600">{formatNumber(product.quantity ?? 0)}개</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500">
          <span className="font-medium text-gray-700">{formatNumber(product.sell_price)}원</span>
          <span>·</span>
          <span>{product.brand_name}</span>
          <span>·</span>
          <span>{product.warehouse_name}</span>
        </div>
      </div>
    </button>
  );
}
