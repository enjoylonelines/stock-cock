"use client";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import { ProductOptionView } from "@/types/product_option_view";

interface ProductListItemProps {
  product: ProductOptionView;
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function ProductListItem({ product, quantity, selected, onClick }: ProductListItemProps) {
  return (
    <button
      type="button"
      className={`w-full p-2 border rounded-lg text-left transition-colors flex gap-2 items-center bg-white shadow-md ${
        selected ? "bg-orange-50 border-orange-500" : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={onClick}
    >
      {/* 제품 이미지 */}
      <div className="overflow-hidden relative w-12 h-12 bg-gray-100 rounded-lg shrink-0">
        <Image src={product.image_url} alt={product.product_name} fill className="object-cover" />
      </div>
      {/* 제품 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 justify-between items-center">
          <h3 className="font-medium truncate">{product.product_name}</h3>
          <div className="text-center shrink-0">
            {quantity !== undefined ? (
              <p className={`text-sm font-medium ${selected ? "text-orange-500" : "text-blue-500"}`}>{formatNumber(quantity)}개</p>
            ) : (
              <p className="text-sm text-gray-600">{formatNumber(product.quantity ?? 0)}개</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 items-center text-xs text-gray-500">
          <span className="font-medium text-gray-700">{formatNumber(product.sell_price)}원</span>
          <span>·</span>
          <span>{formatNumber(product.buy_price)}원</span>
          <span>·</span>
          <span>{product.category_name}</span>
          <span>·</span>
          <span>{product.brand_name}</span>
        </div>
      </div>
    </button>
  );
}
