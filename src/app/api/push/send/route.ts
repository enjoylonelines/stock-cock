import { createClient } from "@/lib/supabase/server";
import { sendPushDirect } from "@/services/push-notification";
import type { PushNotificationInput } from "@/types/api";
import { APIError } from "@/utils/api-error";
import { handleAPIError } from "@/utils/api-handler";
import { apiLogger } from "@/utils/logger";
import { NextResponse } from "next/server";

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

    const result = await sendPushDirect(supabase, { title, body: message, icon, badge, tag, data }, userIds);

    if (result.total === 0) {
      apiLogger.requestSuccess(endpoint, { message: "전송할 구독이 없음", total: 0 });
      return NextResponse.json({
        success: true,
        message: "전송할 구독이 없습니다",
        total: 0,
        successful: 0,
        failed: 0,
      });
    }

    apiLogger.requestSuccess(endpoint, result);
    return NextResponse.json({ success: true, message: "푸시 알림 전송 완료", ...result });
  } catch (error) {
    return handleAPIError(error, endpoint);
  }
}
