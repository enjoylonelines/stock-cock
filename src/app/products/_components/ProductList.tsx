import { Card, CardContent } from "@/components/ui/card";
import { formatBoxBreakdown, formatNumber, formatWeightDisplay } from "@/lib/utils";
import { useProductFilterDrawerStore } from "@/store/productFilterDrawer";
import { useProductSortStore } from "@/store/productSortStore";
import type { ProductOptionView } from "@/types/database";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

type ProductListProps = {
  products: ProductOptionView[];
};

// 우선순위 제품 목록 (상위에 배치할 제품명)
const PRIORITY_PRODUCTS = ["수제 고기왕만두", "수제 김치왕만두", "수제 고기만두", "수제 김치만두", "호떡쌀군만두", "호떡쌀김치군만두"];

// 제품의 우선순위를 반환하는 함수
function getProductPriority(productName: string): number {
  const index = PRIORITY_PRODUCTS.findIndex((priorityName) => productName.includes(priorityName));
  return index === -1 ? PRIORITY_PRODUCTS.length : index; // 우선순위 제품이 아니면 가장 낮은 우선순위
}

// storage_type을 한국어로 변환
function getStorageTypeLabel(storageType: string | null | undefined): string {
  switch (storageType) {
    case "room_temperature":
      return "실온";
    case "refrigerated":
      return "냉장";
    case "frozen":
      return "냉동";
    default:
      return "기타";
  }
}

// storage_type 정렬 우선순위 (실온이 최상단)
function getStorageTypePriority(storageType: string | null | undefined): number {
  switch (storageType) {
    case "room_temperature":
      return 0; // 최상단
    case "refrigerated":
      return 1;
    case "frozen":
      return 2;
    default:
      return 3; // 가장 하단
  }
}

// 원재료 quantity 포맷팅: g/kg은 kg으로 통일, L은 그대로
function formatMaterialQuantity(quantity: number, weight: number, unitLabel: string | null | undefined): string {
  if (!weight) {
    return `${formatNumber(quantity)}${unitLabel}`;
  }
  if (!unitLabel) {
    return `${formatNumber(quantity)}kg`;
  }

  // 총량 계산 (quantity × weight)
  const totalAmount = quantity * weight;

  // 단위에 따라 변환
  const normalizedUnit = unitLabel.toLowerCase();

  if (normalizedUnit === "g") {
    // g을 kg으로 변환 (500g -> 0.5kg)
    const totalKg = totalAmount / 1000;
    // 소수점이 0이면 정수로, 아니면 소수점 1자리까지 표시
    const formattedKg = totalKg % 1 === 0 ? totalKg.toString() : totalKg.toFixed(1);
    return `${formattedKg}kg`;
  }
  if (normalizedUnit === "kg") {
    // kg은 그대로
    const formattedKg = totalAmount % 1 === 0 ? totalAmount.toString() : totalAmount.toFixed(1);
    return `${formattedKg}kg`;
  }
  if (normalizedUnit === "l" || normalizedUnit === "리터") {
    // L은 그대로
    const formattedL = totalAmount % 1 === 0 ? totalAmount.toString() : totalAmount.toFixed(1);
    return `${formattedL}L`;
  }

  // 기타 단위는 그대로
  return `${formatNumber(totalAmount)}${unitLabel}`;
}

// 원재료 summary 포맷팅: weight 단위 × quantity + 나머지
function formatMaterialSummary(quantity: number, weight: number, unitLabel: string | null | undefined): string | null {
  if (!weight || !unitLabel) {
    return null;
  }

  const normalizedUnit = unitLabel.toLowerCase();
  let displayWeight: string;
  let displayUnit: string;
  let totalAmount: number;
  let unitWeight: number; // 단위 무게 (kg 또는 L)

  // weight를 표시용으로 변환하고 단위 무게 계산
  let unitWeightInBaseUnit: number; // 계산용 단위 무게 (g 또는 원래 단위)

  if (normalizedUnit === "g") {
    // g을 kg으로 변환 (표시용)
    const weightKg = weight / 1000;
    displayWeight = weightKg % 1 === 0 ? weightKg.toString() : weightKg.toFixed(1);
    displayUnit = "kg";
    totalAmount = (quantity * weight) / 1000; // 총량 (kg)
    unitWeightInBaseUnit = weight; // 계산용: g 단위
    unitWeight = weightKg; // 표시용: kg 단위
  } else if (normalizedUnit === "kg") {
    displayWeight = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
    displayUnit = "kg";
    totalAmount = quantity * weight; // 총량 (kg)
    unitWeightInBaseUnit = weight; // kg 단위
    unitWeight = weight; // kg 단위
  } else if (normalizedUnit === "l" || normalizedUnit === "리터") {
    displayWeight = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
    displayUnit = "L";
    totalAmount = quantity * weight; // 총량 (L)
    unitWeightInBaseUnit = weight; // L 단위
    unitWeight = weight; // L 단위
  } else {
    displayWeight = weight.toString();
    displayUnit = unitLabel;
    totalAmount = quantity * weight;
    unitWeightInBaseUnit = weight;
    unitWeight = weight;
  }

  // weight 단위로 나누어 박스와 나머지 계산
  // totalAmount를 unitWeight로 나누어서 박스 개수와 나머지 계산
  const boxes = Math.floor(totalAmount / unitWeight);
  const remainder = totalAmount % unitWeight;

  const parts: string[] = [];

  if (boxes > 0) {
    parts.push(`${displayWeight}${displayUnit} × ${formatNumber(boxes)}`);
  }

  if (remainder > 0) {
    const formattedRemainder = remainder % 1 === 0 ? remainder.toString() : remainder.toFixed(1);
    parts.push(`${formattedRemainder}${displayUnit}`);
  } else if (boxes === 0) {
    // 박스가 0이고 나머지도 0이면 0개 표시
    parts.push(`0${displayUnit}`);
  }

  if (parts.length === 0) {
    return `0${displayUnit} × 0`;
  }

  return parts.join(" + ");
}

const ProductList = memo(function ProductList({ products }: ProductListProps) {
  const { filters } = useProductFilterDrawerStore();
  const { sortOption } = useProductSortStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // 검색어 필터
    if (filters.searchQuery) {
      const query = filters.searchQuery.trim().replace(/\s+/g, "").toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.product_name.replace(/\s+/g, "").toLowerCase().includes(query) ||
          product.category_name?.replace(/\s+/g, "").toLowerCase().includes(query) ||
          product.brand_name?.replace(/\s+/g, "").toLowerCase().includes(query),
      );
    }

    // 재고 상태 필터
    if (filters.inStock !== undefined) {
      filtered = filtered.filter((product) => {
        if (filters.inStock === true) {
          return product.quantity > 0;
        }
        if (filters.inStock === false) {
          return product.quantity <= 0;
        }
        return true;
      });
    }

    // 정렬 (원재료는 storage_type 우선, 나머지는 카테고리 우선)
    const sorted = [...filtered].sort((a, b) => {
      const isMaterialA = a.product_type === "material";
      const isMaterialB = b.product_type === "material";

      // 원재료인 경우 storage_type 우선순위 비교 (실온이 최상단)
      if (isMaterialA && isMaterialB) {
        const storagePriorityA = getStorageTypePriority(a.storage_type);
        const storagePriorityB = getStorageTypePriority(b.storage_type);

        if (storagePriorityA !== storagePriorityB) {
          return storagePriorityA - storagePriorityB; // 우선순위가 낮을수록 앞에 배치
        }
      }

      // 원재료가 아닌 경우 카테고리명으로 먼저 정렬
      if (!isMaterialA && !isMaterialB) {
        const categoryCompare = (a.category_name || "기타").localeCompare(b.category_name || "기타", "ko");
        if (categoryCompare !== 0) {
          return categoryCompare;
        }

        // 같은 카테고리 내에서는 storage_type 우선순위 비교
        const storagePriorityA = getStorageTypePriority(a.storage_type);
        const storagePriorityB = getStorageTypePriority(b.storage_type);
        if (storagePriorityA !== storagePriorityB) {
          return storagePriorityA - storagePriorityB;
        }
      }

      // 2. 우선순위 제품 비교
      const priorityA = getProductPriority(a.product_name);
      const priorityB = getProductPriority(b.product_name);

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // 우선순위가 낮을수록 앞에 배치
      }

      // 3. 우선순위가 같으면 기존 정렬 로직 적용
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

  // 제품 타입에 따라 그룹핑 (원재료는 storage_type, 나머지는 category_name)
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductOptionView[]> = {};

    filteredAndSortedProducts.forEach((product) => {
      let groupKey: string;

      if (product.product_type === "material") {
        // 원재료는 storage_type으로 그룹핑 (실온/냉장/냉동)
        groupKey = getStorageTypeLabel(product.storage_type);
      } else {
        // 완제품은 category_name으로 그룹핑
        groupKey = product.category_name || "기타";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(product);
    });

    // 그룹 정렬: 원재료 그룹(storage_type)은 실온이 최상단, 나머지는 알파벳 순
    return Object.entries(groups).sort(([groupA, productsA], [groupB, productsB]) => {
      const isMaterialGroupA = productsA[0]?.product_type === "material";
      const isMaterialGroupB = productsB[0]?.product_type === "material";

      // 원재료 그룹인 경우 storage_type 우선순위로 정렬
      if (isMaterialGroupA && isMaterialGroupB) {
        const priorityA = getStorageTypePriority(
          groupA === "실온" ? "room_temperature" : groupA === "냉장" ? "refrigerated" : groupA === "냉동" ? "frozen" : null,
        );
        const priorityB = getStorageTypePriority(
          groupB === "실온" ? "room_temperature" : groupB === "냉장" ? "refrigerated" : groupB === "냉동" ? "frozen" : null,
        );

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
      }

      // 원재료 그룹을 일반 그룹보다 앞에 배치 (선택사항)
      // 또는 알파벳 순으로 정렬
      return groupA.localeCompare(groupB, "ko");
    });
  }, [filteredAndSortedProducts]);

  // 그룹 이름 목록 메모이제이션
  const groupNames = useMemo(() => groupedProducts.map(([name]) => name), [groupedProducts]);

  // 그룹 목록이 변경될 때 냉장/냉동을 제외한 모든 그룹을 펼친 상태로 초기화
  useEffect(() => {
    const initialExpanded = new Set<string>();
    groupNames.forEach((name) => {
      if (name !== "냉장" && name !== "냉동") {
        initialExpanded.add(name);
      }
    });

    // 기존에 펼쳐진 그룹 중에서 여전히 존재하는 그룹만 유지하고, 새로운 그룹 추가
    setExpandedGroups((prev) => {
      const newSet = new Set<string>();
      prev.forEach((name) => {
        if (groupNames.includes(name)) {
          newSet.add(name);
        }
      });
      // 새로운 그룹 중 냉장/냉동이 아닌 것은 추가
      initialExpanded.forEach((name) => {
        if (!newSet.has(name)) {
          newSet.add(name);
        }
      });
      return newSet;
    });
  }, [groupNames]);

  // 그룹 토글 함수
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {groupedProducts.map(([groupName, groupProducts]) => {
        const isExpanded = expandedGroups.has(groupName);

        return (
          <div key={groupName} className="flex flex-col gap-2">
            {/* 그룹 헤더 (카테고리 또는 보관방식) */}
            <button
              type="button"
              className="px-1 py-1 w-full text-left rounded-md transition-colors cursor-pointer hover:bg-gray-50"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex gap-2 items-center">
                <h2 className="text-sm font-semibold text-gray-600">{groupName}</h2>
                <span className="text-gray-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>
            </button>
            {/* 그룹별 제품 리스트 */}
            {isExpanded &&
              groupProducts.map((product) => {
                const hasImage = product.image_url && product.image_url.trim() !== "";
                const isMaterial = product.product_type === "material";
                const boxSummary = isMaterial ? null : formatBoxBreakdown(product.quantity, product.box_unit);
                const materialSummary = isMaterial ? formatMaterialSummary(product.quantity, product.weight, product.unit_label) : null;

                // 현재 탭 정보를 포함한 URL 생성
                const getProductUrl = () => {
                  if (typeof window !== "undefined") {
                    const currentTab = sessionStorage.getItem("products_selected_tab") || "company";
                    return `/products/${product.product_option_id}?tab=${currentTab}`;
                  }
                  return `/products/${product.product_option_id}`;
                };

                return (
                  <Link key={product.product_option_id} href={getProductUrl()}>
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
                            <div className="flex gap-2 items-center">
                              <h3 className="font-medium">
                                {product.product_name}{" "}
                                {isMaterial ? (
                                  product.weight &&
                                  product.unit_label && (
                                    <span className="text-xs text-gray-500">{`${product.weight}${product.unit_label}`}</span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    {formatWeightDisplay(product.weight, product.unit_label as "g" | "kg" | undefined)}
                                  </span>
                                )}
                              </h3>
                              {product.storage_type && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700">
                                  {getStorageTypeLabel(product.storage_type)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap mt-1 text-xs text-gray-600">
                              {isMaterial ? (
                                <>
                                  {product.origin && <span>{product.origin}</span>}
                                  {product.origin && product.brand_name && <span className="mx-1">·</span>}
                                  {product.brand_name && <span>{product.brand_name}</span>}
                                  {(product.origin || product.brand_name) && product.warehouse_name && <span className="mx-1">·</span>}
                                  <span>{product.warehouse_name}</span>
                                </>
                              ) : (
                                <>
                                  <span>{product.brand_name}</span>
                                  <span className="mx-1">·</span>
                                  <span>{product.warehouse_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {isMaterial ? (
                              <>
                                <div className="text-2xl font-semibold text-blue-600">
                                  {formatMaterialQuantity(product.quantity, product.weight, product.unit_label)}
                                </div>
                                {materialSummary && <p className="mt-1 text-xs text-gray-500">{materialSummary}</p>}
                              </>
                            ) : (
                              <>
                                <div className="text-2xl font-semibold text-blue-600">{formatNumber(product.quantity)}봉</div>
                                {boxSummary && <p className="mt-1 text-xs text-gray-500">{boxSummary}</p>}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
        );
      })}
    </div>
  );
});

ProductList.displayName = "ProductList";

export default ProductList;
