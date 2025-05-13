"use client";

import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import { Product } from "@/types/product";
import Link from "next/link";

interface ProductDetailProps {
  product: Product;
}

export default function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white">
        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">상품 상세</h1>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* 상품 정보 */}
      <div className="flex-1 p-4 space-y-4">
        {/* 기본 정보 카드 */}
        <div className="p-4 bg-white rounded-lg">
          <div className="flex gap-4">
            <div className="relative w-24 h-24 overflow-hidden bg-gray-100 rounded-lg shrink-0">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{product.name}</h2>
                  <p className="text-sm text-gray-500">SKU-{product.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-xl font-bold text-blue-500">{formatNumber(product.stock)}</div>
              </div>
              <div className="flex flex-wrap mt-2 text-sm text-gray-600">
                <span>{formatNumber(product.sell_price)}원 |&nbsp;</span>
                <span>{formatNumber(product.buy_price)}원 |&nbsp;</span>
                <span>{product.category} |&nbsp;</span>
                <span>{product.brand}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 위치별 재고 현황 */}
        <div className="p-4 bg-white rounded-lg">
          <h3 className="flex items-center justify-between mb-4 text-lg font-semibold">
            <span>2개 위치</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-gray-500">재고 보유</span>
              <div className="w-8 h-4 rounded-full bg-gray-200" />
            </div>
          </h3>
          <div className="space-y-2">
            <Button variant="ghost" className="flex items-center justify-between w-full p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>기본 위치</span>
              </div>
              <span className="text-blue-500">{formatNumber(1999)}</span>
            </Button>
            <Button variant="ghost" className="flex items-center justify-between w-full p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>기본 위치2</span>
              </div>
              <span className="text-blue-500">{formatNumber(0)}</span>
            </Button>
          </div>
        </div>

        {/* 재고 변동 내역 */}
        <div className="p-4 bg-white rounded-lg">
          <h3 className="mb-4 text-lg font-semibold">재고 변동 내역</h3>
          <div className="text-center">
            <p className="text-sm text-gray-500">아직 재고 변동 내역이 없습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
