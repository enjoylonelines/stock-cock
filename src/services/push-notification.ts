/**
 * 푸시 알림 전송 서비스
 */

interface PushNotificationData {
  type: string;
  transactionId?: string;
  productId?: string;
  productName?: string;
  transactionType?: string;
}

interface SendPushNotificationParams {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: PushNotificationData;
}

const PUSH_API_URL = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/push/send`;

/**
 * 푸시 알림을 전송합니다.
 * @param params 푸시 알림 파라미터
 * @returns 전송 성공 여부 (에러 발생 시에도 false만 반환하고 throw하지 않음)
 */
export async function sendPushNotification(params: SendPushNotificationParams): Promise<boolean> {
  try {
    const response = await fetch(PUSH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        icon: params.icon || "/icons/logo-192x192.png",
        tag: params.tag,
        data: params.data || {},
      }),
    });

    return response.ok;
  } catch (error) {
    // 푸시 알림 실패는 전체 프로세스를 중단시키지 않음
    // 서비스 레이어에서는 logger를 사용하지 않음 (API 레이어에서 처리)
    return false;
  }
}
