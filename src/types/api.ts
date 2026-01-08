/**
 * API 요청/응답 타입 정의
 */

/**
 * 표준화된 API 에러 응답 타입
 */
export interface APIErrorResponse {
  error: string;
  code?: string;
  detail?: string;
  statusCode: number;
}

/**
 * 표준화된 API 성공 응답 타입
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

/**
 * API 응답 타입 (성공 또는 에러)
 */
export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

/**
 * 트랜잭션 타입
 */
export type TransactionType = "in" | "out" | "move" | "adjust";

/**
 * 트랜잭션 아이템 입력 타입
 */
export interface TransactionItemInput {
  quantity: number;
  unit_price: number;
  option_id: string;
  expiration_date?: string | null;
}

/**
 * 입출고 요청 타입 (Transaction)
 */
export interface TransactionInput {
  type: "in" | "out";
  warehouse_id: string;
  supplier_id?: string;
  memo?: string;
  created_at?: string;
  items: TransactionItemInput[];
  user_id: string;
}

/**
 * 재고 조정 요청 타입
 */
export interface AdjustmentInput {
  warehouse_id: string;
  memo?: string;
  created_at?: string;
  items: TransactionItemInput[];
  user_id: string;
}

/**
 * 재고 이동 요청 타입
 */
export interface MoveInput {
  from_warehouse_id: string;
  to_warehouse_id: string;
  memo?: string;
  created_at?: string;
  items: Omit<TransactionItemInput, "expiration_date">[];
  user_id: string;
}

/**
 * 제품 등록 요청 타입
 */
export interface ProductCreateInput {
  product: {
    name: string;
    category: string;
    brand: string;
    sell_price: number;
    buy_price: number;
    image_url?: string;
    [key: string]: unknown;
  };
  options: Array<{
    option_value: string;
    [key: string]: unknown;
  }>;
}

/**
 * 푸시 알림 전송 요청 타입
 */
export interface PushNotificationInput {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  userIds?: string[];
}
