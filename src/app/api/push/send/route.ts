import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

// VAPID 키 설정
webpush.setVapidDetails(
  "mailto:hobeom5022@naver.com", // 실제 이메일로 변경
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { title, body: message, icon, badge, tag, data, userIds } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "제목과 메시지는 필수입니다" }, { status: 400 });
    }

    // 특정 사용자들에게만 전송하는 경우
    let subscriptions;
    if (userIds && userIds.length > 0) {
      const { data: userSubscriptions, error } = await supabase.from("push_subscriptions").select("*").in("user_id", userIds);

      if (error) {
        console.error("구독 정보 조회 오류:", error);
        return NextResponse.json({ error: "구독 정보 조회 실패" }, { status: 500 });
      }

      subscriptions = userSubscriptions;
    } else {
      // 모든 사용자에게 전송
      const { data: allSubscriptions, error } = await supabase.from("push_subscriptions").select("*");

      if (error) {
        console.error("구독 정보 조회 오류:", error);
        return NextResponse.json({ error: "구독 정보 조회 실패" }, { status: 500 });
      }

      subscriptions = allSubscriptions;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "전송할 구독이 없습니다" }, { status: 200 });
    }

    // 푸시 알림 전송
    const pushPromises = subscriptions.map(async (subscription) => {
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
          badge: badge || "/icons/icon-48x48.png",
          tag: tag || "stock-cock-notification",
          data: data || {},
          actions: [
            {
              action: "view",
              title: "확인",
            },
            {
              action: "close",
              title: "닫기",
            },
          ],
        });

        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, userId: subscription.user_id };
      } catch (error) {
        console.error(`푸시 알림 전송 실패 (${subscription.user_id}):`, error);
        return { success: false, userId: subscription.user_id, error };
      }
    });

    const results = await Promise.allSettled(pushPromises);
    const successful = results.filter((result) => result.status === "fulfilled" && result.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      message: "푸시 알림 전송 완료",
      total: subscriptions.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("푸시 알림 전송 오류:", error);
    return NextResponse.json({ error: "푸시 알림 전송 실패" }, { status: 500 });
  }
}
