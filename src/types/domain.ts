/**
 * 도메인 타입 정의
 *
 * DB/Supabase 타입과 분리된 비즈니스 로직용 타입
 * - product_type: UI 분류 (탭, 필터링)
 * - StockUnit: 재고 단위 (비즈니스 로직)
 */

// ============================================
// Stock Unit (재고 단위)
// ============================================
export type StockUnit = "EA" | "GRAM";

// ============================================
// Product Type (UI 분류)
// ============================================
export type ProductType = "company" | "franchise" | "pb" | "material";

// ============================================
// Storage Type (보관 방법)
// ============================================
export type StorageType = "room_temperature" | "refrigerated" | "frozen";

// ============================================
// Domain Inventory Item (변환 후 타입)
// ============================================
export interface DomainInventoryItem {
  // 식별자
  productOptionId: string;
  productId: string;

  // 기본 정보
  name: string;
  imageUrl: string | null;

  // UI 분류
  productType: ProductType;
  brandName: string;
  categoryName: string;
  storageType: StorageType | null;

  // 규격 정보
  weight: number; // 규격 중량 (DB 저장값 그대로)
  unitLabel: string; // "g" | "kg"
  boxUnit: number | null;
  sku: string | null;

  // 창고 정보
  warehouseId: string | null;
  warehouseName: string | null;
  inventoryId: string | null;

  // 재고 (정수)
  stockUnit: StockUnit;
  stock: number; // EA: 개수, GRAM: 그램 (정수)

  // 선택 수량 (트랜잭션용)
  quantity: number; // EA: 개수, GRAM: 그램 (정수)
}

// ============================================
// Domain Transaction Item (트랜잭션용)
// ============================================
export interface DomainTransactionItem {
  productOptionId: string;
  stockUnit: StockUnit;
  quantity: number; // 정수 (EA: 개수, GRAM: 그램)
  productType: ProductType;
}
