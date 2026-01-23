/**
 * 트랜잭션 알림 공통 유틸리티
 * 입고/출고/조정/이동 시 공통으로 사용하는 알림 전송 로직
 */

import { sendPushNotification } from "@/services/push-notification";
import type { TransactionType } from "@/types/api";
import { apiLogger } from "@/utils/logger";
import { getProductIconUrl } from "@/utils/product-icon";

interface TransactionNotificationParams {
  type: TransactionType;
  transactionId: string;
  itemCount: number;
  firstOptionId?: string;
  productId?: string;
  productImageUrl?: string;
}

/**
 * 트랜잭션 타입에 따른 알림 제목과 본문 반환
 */
function getNotificationContent(type: TransactionType, itemCount: number): { title: string; body: string } {
  switch (type) {
    case "in":
      return {
        title: "입고 완료",
        body: `${itemCount}개 제품이 입고되었습니다`,
      };
    case "out":
      return {
        title: "출고 완료",
        body: `${itemCount}개 제품이 출고되었습니다`,
      };
    case "adjust":
      return {
        title: "재고 조정 완료",
        body: `${itemCount}개 제품의 재고가 조정되었습니다`,
      };
    case "move":
      return {
        title: "재고 이동 완료",
        body: `${itemCount}개 제품이 이동되었습니다`,
      };
    default:
      return {
        title: "트랜잭션 완료",
        body: `${itemCount}개 제품이 처리되었습니다`,
      };
  }
}

/**
 * 트랜잭션 타입에 따른 알림 태그 생성
 */
function getNotificationTag(type: TransactionType, transactionId: string): string {
  return `${type}-${transactionId}`;
}

/**
 * 트랜잭션 타입에 따른 알림 데이터 생성
 */
function getNotificationData(type: TransactionType, transactionId: string): Record<string, unknown> {
  const baseData = {
    transactionId,
  };

  switch (type) {
    case "in":
    case "out":
      return {
        ...baseData,
        type: "transaction",
        transactionType: type,
      };
    case "adjust":
      return {
        ...baseData,
        type: "adjustment",
      };
    case "move":
      return {
        ...baseData,
        type: "move",
      };
    default:
      return baseData;
  }
}

/**
 * 트랜잭션 완료 알림 전송
 * @param params 트랜잭션 알림 파라미터
 * @returns 알림 전송 성공 여부
 */
export async function sendTransactionNotification(params: TransactionNotificationParams): Promise<boolean> {
  try {
    const { type, transactionId, itemCount, firstOptionId, productId, productImageUrl } = params;

    // 알림 제목/본문 생성
    const { title, body } = getNotificationContent(type, itemCount);

    // 아이콘 URL 결정
    let iconUrl: string | undefined;

    // 1순위: 직접 전달된 productImageUrl
    if (productImageUrl) {
      iconUrl = productImageUrl;
    }
    // 2순위: firstOptionId로 조회
    else if (firstOptionId) {
      iconUrl = await getProductIconUrl(firstOptionId);
      // getProductIconUrl은 실패 시 기본값을 반환하므로 항상 문자열 반환
      // 기본값이면 undefined로 처리 (서비스에서 기본값 처리)
      if (iconUrl === "/icons/logo-192x192.png") {
        iconUrl = undefined;
      }
    }
    // 3순위: productId로 조회 (필요시 추가)
    // else if (productId) { ... }

    // 알림 전송
    const notificationData = getNotificationData(type, transactionId);
    return await sendPushNotification({
      title,
      body,
      icon: iconUrl,
      tag: getNotificationTag(type, transactionId),
      data: {
        type: notificationData.type as string,
        transactionId: notificationData.transactionId as string | undefined,
        transactionType: notificationData.transactionType as string | undefined,
      },
    });
  } catch (error) {
    // 알림 실패는 전체 프로세스를 중단시키지 않음
    apiLogger.requestError("transaction-notification", error as Error, { params });
    return false;
  }
}
