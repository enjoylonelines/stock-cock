import type { PushNotificationInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

const subject = "https://stock-cock.vercel.app";
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

// VAPID 키 설정
if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

export async function POST(request: Request) {
  const endpoint = "/api/push/send";
  const supabase = await createClient();

  try {
    const body: PushNotificationInput = await request.json();
    const { title, body: message, icon, badge, tag, data, userIds } = body;

    apiLogger.requestStart(endpoint, { title, hasUserIds: !!userIds });

    if (!title || !message) {
      throw APIError.badRequest("제목과 메시지는 필수입니다.");
    }

    // 특정 사용자들에게만 전송하는 경우
    let subscriptions: Array<{
      id: string;
      user_id: string;
      endpoint: string;
      p256dh_key: string;
      auth_key: string;
      created_at: string;
    }> = [];
    if (userIds && userIds.length > 0) {
      const { data: userSubscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds);

      if (error) {
        apiLogger.dbError("구독 정보 조회", error);
        throw APIError.fromSupabaseError(error);
      }

      subscriptions = userSubscriptions || [];
    } else {
      // 모든 사용자에게 전송
      const { data: allSubscriptions, error } = await supabase.from("push_subscriptions").select("*");

      if (error) {
        apiLogger.dbError("구독 정보 조회", error);
        throw APIError.fromSupabaseError(error);
      }

      subscriptions = allSubscriptions || [];
    }

    if (!subscriptions || subscriptions.length === 0) {
      apiLogger.requestSuccess(endpoint, { message: "전송할 구독이 없음", total: 0 });
      return NextResponse.json({
        success: true,
        message: "전송할 구독이 없습니다",
        total: 0,
        successful: 0,
        failed: 0,
      });
    }

    // 푸시 알림 전송
    const pushPromises = subscriptions.map(async subscription => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        const payload = JSON.stringify({
          title,
          body: message,
          icon: icon || "/icons/icon-192x192.png",
          badge: badge || "/icons/icon-192x192.png",
          tag: tag || "hankki-stock-notification",
          data: data || {},
        });

        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, userId: subscription.user_id };
      } catch (error) {
        apiLogger.requestError(endpoint, error as Error, { userId: subscription.user_id });
        return { success: false, userId: subscription.user_id, error };
      }
    });

    const results = await Promise.allSettled(pushPromises);
    const successful = results.filter(result => result.status === "fulfilled" && result.value.success).length;
    const failed = results.length - successful;

    apiLogger.requestSuccess(endpoint, { total: subscriptions.length, successful, failed });
    return NextResponse.json({
      success: true,
      message: "푸시 알림 전송 완료",
      total: subscriptions.length,
      successful,
      failed,
    });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
