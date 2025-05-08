import Image from "next/image";
import { Product } from "@/types/product";
import { formatNumber } from "@/lib/utils";

interface ProductListItemProps {
  product: Product;
  quantity?: number;
  selected?: boolean;
  onClick?: () => void;
}

export default function ProductListItem({ product, quantity, selected, onClick }: ProductListItemProps) {
  return (
    <button
      type="button"
      className={`w-full p-2 border rounded-lg text-left transition-colors flex gap-2 items-center ${
        selected ? "border-orange-500 bg-orange-50" : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={onClick}
    >
      {/* 제품 이미지 */}
      <div className="relative w-12 h-12 overflow-hidden bg-gray-100 rounded-lg shrink-0">
        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
      </div>
      {/* 제품 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium truncate">{product.name}</h3>
          <div className="text-center shrink-0">
            {quantity !== undefined ? (
              <p className={`text-sm font-medium ${selected ? "text-orange-500" : "text-blue-500"}`}>{formatNumber(quantity)}개</p>
            ) : (
              <p className="text-sm text-gray-600">{formatNumber(product.quantity ?? 0)}개</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{formatNumber(product.sellPrice)}원</span>
          <span>·</span>
          <span>{formatNumber(product.buyPrice)}원</span>
          <span>·</span>
          <span>{product.category}</span>
          <span>·</span>
          <span>{product.brand}</span>
        </div>
      </div>
    </button>
  );
}
