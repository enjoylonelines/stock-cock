/**
 * 인벤토리 도메인 변환 함수
 *
 * DB View 타입 → 도메인 타입 변환
 * null 처리를 이 레이어에서 중앙화
 */

import type { Database } from "@/types/database";
import type { DomainInventoryItem, ProductType, StockUnit, StorageType } from "@/types/domain";

// Supabase View Row 타입
type ProductOptionInventoryViewRow = Database["public"]["Views"]["product_option_inventory_view"]["Row"];

// ============================================
// 1. StockUnit 추론 함수
// ============================================
export function getStockUnit(productType: string | null): StockUnit {
  return productType === "material" ? "GRAM" : "EA";
}

// ============================================
// 2. ProductType 정규화
// ============================================
export function normalizeProductType(raw: string | null): ProductType {
  if (raw === "material" || raw === "franchise" || raw === "pb" || raw === "company") {
    return raw;
  }
  return "company"; // 기본값
}

// ============================================
// 3. StorageType 정규화
// ============================================
export function normalizeStorageType(raw: string | null): StorageType | null {
  if (raw === "room_temperature" || raw === "refrigerated" || raw === "frozen") {
    return raw;
  }
  return null;
}

// ============================================
// 4. View → Domain 변환 함수 (중앙화)
// ============================================
export function toInventoryItem(view: ProductOptionInventoryViewRow): DomainInventoryItem | null {
  // 필수 필드 검증 (null 처리 중앙화)
  if (!view.product_option_id || !view.product_id || !view.product_name) {
    return null;
  }

  const productType = normalizeProductType(view.product_type);
  const stockUnit = getStockUnit(view.product_type);

  // 재고값 결정 (정수)
  const stock = stockUnit === "GRAM" ? Math.round(view.weight_in_grams ?? 0) : Math.round(view.quantity ?? 0);

  return {
    // 식별자
    productOptionId: view.product_option_id,
    productId: view.product_id,

    // 기본 정보
    name: view.product_name,
    imageUrl: view.image_url,

    // UI 분류
    productType,
    brandName: view.brand_name ?? "",
    categoryName: view.category_name ?? "",
    storageType: normalizeStorageType(view.storage_type),

    // 규격 정보
    weight: view.weight ?? 0,
    unitLabel: view.unit_label ?? "g",
    boxUnit: view.box_unit,
    sku: view.sku,

    // 창고 정보
    warehouseId: view.warehouse_id,
    warehouseName: view.warehouse_name,
    inventoryId: view.inventory_id,

    // 재고
    stockUnit,
    stock,

    // 선택 수량 (기본값)
    quantity: 0,
  };
}

// ============================================
// 5. 배열 변환 (null 필터링 포함)
// ============================================
export function toInventoryItems(views: ProductOptionInventoryViewRow[]): DomainInventoryItem[] {
  return views.map(toInventoryItem).filter((item): item is DomainInventoryItem => item !== null);
}

// ============================================
// 6. 선택 수량 설정 (immutable)
// ============================================
export function withQuantity(item: DomainInventoryItem, quantity: number): DomainInventoryItem {
  return {
    ...item,
    quantity: Math.round(quantity), // 항상 정수
  };
}

// ============================================
// 7. 타입 가드
// ============================================
export function isMaterialItem(item: DomainInventoryItem): boolean {
  return item.stockUnit === "GRAM";
}

export function isFinishedItem(item: DomainInventoryItem): boolean {
  return item.stockUnit === "EA";
}
