import { Card, CardContent } from "@/components/ui/card";
import { formatBoxBreakdown, formatNumber } from "@/lib/utils";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { useProductSortStore } from "@/store/productSortStore";
import type { ProductOptionView } from "@/types/product_option_view";
import Image from "next/image";
import Link from "next/link";
import { memo, useMemo } from "react";

type ProductListProps = {
  products: ProductOptionView[];
};

const ProductList = memo(function ProductList({ products }: ProductListProps) {
  const { filters } = useProductFilterDrawerStore();
  const { sortOption } = useProductSortStore();

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // 검색어 필터
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.product_name.toLowerCase().includes(query) ||
          product.category_name?.toLowerCase().includes(query) ||
          product.brand_name?.toLowerCase().includes(query)
      );
    }

    // 재고 상태 필터
    if (filters.inStock !== undefined) {
      filtered = filtered.filter(product => {
        if (filters.inStock === true) {
          return product.quantity > 0;
        }
        if (filters.inStock === false) {
          return product.quantity <= 0;
        }
        return true;
      });
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.product_name.localeCompare(b.product_name, "ko");
        case "name-desc":
          return b.product_name.localeCompare(a.product_name, "ko");
        case "quantity-desc":
          return b.quantity - a.quantity;
        case "quantity-asc":
          return a.quantity - b.quantity;
        default:
          return a.product_name.localeCompare(b.product_name, "ko");
      }
    });

    return sorted;
  }, [products, filters, sortOption]);

  return (
    <div className="flex flex-col gap-2">
      {filteredAndSortedProducts.map(product => {
        const boxSummary = formatBoxBreakdown(product.quantity, product.box_unit);
        const hasImage = product.image_url && product.image_url.trim() !== "";

        return (
          <Link key={product.product_option_id} href={`/products/${product.product_option_id}`}>
            <Card className="px-4 py-2 transition-colors bg-slate-50 hover:bg-slate-100">
              <CardContent className="p-0">
                <div className="flex gap-4 items-center">
                  <div className="flex overflow-hidden relative flex-shrink-0 justify-center items-center w-14 h-14 rounded-md bg-slate-200">
                    {hasImage ? (
                      <Image
                        src={product.image_url}
                        alt={product.product_name}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex justify-center items-center w-full h-full text-sm font-medium text-gray-400">
                        {product.product_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {product.product_name} {product.weight}g
                    </h3>
                    <div className="flex flex-wrap mt-1 text-xs text-gray-600">
                      <span>{formatNumber(product.sell_price)}원</span>
                      <span className="mx-1">·</span>
                      <span>{product.brand_name}</span>
                      <span className="mx-1">·</span>
                      <span>{product.warehouse_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-blue-600">{formatNumber(product.quantity)}개</div>
                    {boxSummary && <p className="mt-1 text-xs text-gray-500">{boxSummary}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
});

ProductList.displayName = "ProductList";

export default ProductList;
