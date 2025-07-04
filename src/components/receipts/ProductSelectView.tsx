import { useState } from "react";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils";
import ProductQuantityDialog from "./ProductQuantityDialog";
import { Product } from "@/types/product";
import ProductListItem from "./ProductListItem";

interface ProductSelectViewProps {
  onBack: () => void;
  onSelect: (products: Product[]) => void;
  products: Product[];
}

export default function ProductSelectView({ onBack, onSelect, products }: ProductSelectViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    const existing = selectedProducts.find((p) => p.product_id === product.product_id);
    setCurrentQuantity(existing ? existing.quantity ?? 0 : 0);
    setQuantityDialogOpen(true);
  };

  const handleQuantityConfirm = (product: Product, quantity: number) => {
    if (!quantity) {
      setSelectedProducts((prev) => prev.filter((p) => p.product_id !== product.product_id));
      return;
    }

    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.product_id === product.product_id);
      if (existing) {
        return prev.map((p) => (p.product_id === product.product_id ? { ...p, quantity } : p));
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const isSelected = (productId: string, sku: string) => {
    return selectedProducts.some((p) => p.product_id === productId && p.sku === sku);
  };

  const getSelectedQuantity = (productId: string) => {
    const selected = selectedProducts.find((p) => p.product_id === productId);
    return selected ? selected.quantity ?? 0 : 0;
  };

  const getTotalQuantity = (products: Product[]) => {
    return products.reduce((acc, curr) => acc + (curr.quantity ?? 0), 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">제품 선택</h2>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
          <Input
            placeholder="제품 이름, 바코드, 속성 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 제품 목록 */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-2">
          {filteredProducts.map((product) => (
            <ProductListItem
              key={product.product_id}
              product={product}
              quantity={isSelected(product.product_id, product.sku) ? getSelectedQuantity(product.product_id) : undefined}
              selected={isSelected(product.product_id, product.sku)}
              onClick={() => handleProductClick(product)}
            />
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">총 {formatNumber(getTotalQuantity(selectedProducts))}개 선택</span>
        </div>
        <Button
          className="w-full text-white bg-orange-500 hover:bg-orange-600"
          onClick={() => onSelect(selectedProducts)}
          disabled={selectedProducts.length === 0}
        >
          선택 완료
        </Button>
      </div>

      {/* 수량 선택 모달 */}
      <ProductQuantityDialog
        quantity={currentQuantity}
        setQuantity={setCurrentQuantity}
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        product={selectedProduct}
        onConfirm={handleQuantityConfirm}
      />
    </div>
  );
}
