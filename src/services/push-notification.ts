/**
 * 푸시 알림 전송 서비스
 * HTTP 경유 없이 web-push를 직접 호출
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

const subject = "https://stock-cock.vercel.app";
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * web-push를 직접 호출하여 구독자들에게 알림을 전송합니다.
 * @param supabase - 인증된 Supabase 클라이언트
 * @param payload - 전송할 알림 내용
 * @param userIds - 특정 사용자 ID 목록 (미전달 시 전체 사용자)
 */
export async function sendPushDirect(
  supabase: SupabaseClient,
  payload: PushPayload,
  userIds?: string[]
): Promise<{ total: number; successful: number; failed: number }> {
  let query = supabase.from("push_subscriptions").select("*");
  if (userIds?.length) {
    query = query.in("user_id", userIds);
  }

  const { data: subscriptions, error } = await query;

  if (error) {
    throw error;
  }

  if (!subscriptions?.length) {
    return { total: 0, successful: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: payload.badge || "/icons/icon-192x192.png",
          tag: payload.tag || "hankki-stock-notification",
          data: payload.data || {},
        })
      )
    )
  );

  const successful = results.filter(r => r.status === "fulfilled").length;
  return { total: subscriptions.length, successful, failed: subscriptions.length - successful };
}

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

/**
 * 내부 알림 전송용 편의 함수.
 * createClient를 자동으로 생성하여 sendPushDirect를 호출합니다.
 * 실패해도 false만 반환하고 throw하지 않음.
 */
export async function sendPushNotification(params: SendPushNotificationParams): Promise<boolean> {
  try {
    const supabase = await createClient();
    const result = await sendPushDirect(supabase, params);
    return result.successful > 0 || result.total === 0;
  } catch {
    return false;
  }
}
