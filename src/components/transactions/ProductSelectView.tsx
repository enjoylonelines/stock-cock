import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventories } from "@/hooks/useInventories";
import { formatNumber } from "@/lib/utils";
import type { ProductOptionView } from "@/types/database";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import ProductListItem from "./ProductListItem";
import ProductQuantityDialog from "./ProductQuantityDialog";

interface ProductSelectViewProps {
  onBack: () => void;
  onSelect: (products: ProductOptionView[]) => void;
  products: ProductOptionView[];
  allowNegative?: boolean; // 조정 모드에서 음수 허용
  selectedLocationId?: string; // 조정 모드에서 현재 재고 확인용
  initialSelectedProducts?: ProductOptionView[]; // 초기 선택된 제품 목록
}

export default function ProductSelectView({
  onBack,
  onSelect,
  products,
  allowNegative = false,
  selectedLocationId,
  initialSelectedProducts = [],
}: ProductSelectViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<ProductOptionView[]>(initialSelectedProducts);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOptionView | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [initialQuantity, setInitialQuantity] = useState(0); // 모달이 열릴 때의 초기 수량 저장
  const { inventories } = useInventories();

  // initialSelectedProducts가 변경되면 로컬 state 업데이트
  useEffect(() => {
    setSelectedProducts(initialSelectedProducts);
  }, [initialSelectedProducts]);

  const filteredProducts = products.filter((product) => product.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

  // 제품별 현재 재고 계산
  const getCurrentStock = (productOptionId: string) => {
    if (selectedLocationId) {
      // 특정 위치의 재고
      return inventories.find((inv) => inv.product_option_id === productOptionId && inv.warehouse_id === selectedLocationId)?.quantity ?? 0;
    }
    // 전체 재고 (product.quantity는 모든 위치의 재고 합계)
    const product = products.find((p) => p.product_option_id === productOptionId);
    return product?.quantity ?? 0;
  };

  const handleProductClick = (product: ProductOptionView) => {
    setSelectedProduct(product);
    const existing = selectedProducts.find((p) => p.product_option_id === product.product_option_id);
    let initialQty = 0;
    if (existing) {
      // 이미 선택된 제품이 있으면 기존 수량 사용
      initialQty = existing.quantity ?? 0;
    } else {
      // 선택되지 않은 제품의 경우
      if (allowNegative) {
        // 조정 모드: 현재 재고를 초기값으로 설정
        initialQty = getCurrentStock(product.product_option_id);
      } else {
        // 일반 모드: 0으로 초기화 (추가할 수량)
        initialQty = 0;
      }
    }
    setCurrentQuantity(initialQty);
    setInitialQuantity(initialQty); // 초기 수량 저장 (빈 문자열일 때 유지할 값)
    setQuantityDialogOpen(true);
  };

  const handleQuantityConfirm = (product: ProductOptionView, quantity: number) => {
    // 조정 모드에서는 수량 0도 허용
    if (!allowNegative && !quantity) {
      setSelectedProducts((prev) => prev.filter((p) => p.product_option_id !== product.product_option_id));
      return;
    }

    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.product_option_id === product.product_option_id);
      if (existing) {
        return prev.map((p) => (p.product_option_id === product.product_option_id ? { ...p, quantity } : p));
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // 모달이 닫힐 때 적용하지 않았으면 원래 수량으로 되돌리기
      setCurrentQuantity(initialQuantity);

      // 안드로이드에서 키보드가 닫힌 후 drawer 높이 복원
      setTimeout(() => {
        const drawerContent = document.querySelector('[data-slot="drawer-content"]') as HTMLElement;
        if (drawerContent) {
          drawerContent.style.height = "90vh";
        }
      }, 150);
    }
    setQuantityDialogOpen(open);
  };

  const isSelected = (productOptionId: string) => {
    return selectedProducts.some((p) => p.product_option_id === productOptionId);
  };

  const getSelectedQuantity = (productOptionId: string) => {
    const selected = selectedProducts.find((p) => p.product_option_id === productOptionId);
    return selected ? selected.quantity ?? 0 : 0;
  };

  const getTotalQuantity = (products: ProductOptionView[]) => {
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
              key={product.product_option_id}
              product={product}
              quantity={isSelected(product.product_option_id) ? getSelectedQuantity(product.product_option_id) : undefined}
              selected={isSelected(product.product_option_id)}
              onClick={() => handleProductClick(product)}
              currentStock={allowNegative && selectedLocationId ? getCurrentStock(product.product_option_id) : undefined}
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
        onOpenChange={handleDialogOpenChange}
        product={selectedProduct}
        onConfirm={handleQuantityConfirm}
        allowNegative={allowNegative}
        selectedLocationId={selectedLocationId}
        initialQuantity={initialQuantity}
      />
    </div>
  );
}
