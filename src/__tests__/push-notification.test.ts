/**
 * sendPushDirect 엣지 케이스 테스트
 *
 * 위험 시나리오:
 * 1. 구독자 0명 → 빈 결과 반환 (webpush.sendNotification 호출 없어야 함)
 * 2. userIds 필터 → .in() 적용 여부 확인
 * 3. Supabase 쿼리 에러 → throw (sendPushNotification 래퍼는 false 반환)
 * 4. 일부 sendNotification 실패 → Promise.allSettled로 partial success 집계
 */

import { sendPushDirect } from "@/services/push-notification";
import type { SupabaseClient } from "@supabase/supabase-js";

// web-push 모듈 전체를 mock — 실제 VAPID 키 없이 테스트
jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

// web-push mock 타입 참조
import webpush from "web-push";
const mockSendNotification = webpush.sendNotification as jest.Mock;

// -------------------------
// Mock Supabase 헬퍼
// -------------------------

/**
 * push_subscriptions 쿼리를 흉내내는 mock 빌더.
 *
 * sendPushDirect의 쿼리 흐름:
 *   supabase.from("push_subscriptions").select("*")            → queryBuilder 반환
 *   queryBuilder.in("user_id", userIds)                        → (userIds 있을 때만) 동일 queryBuilder 반환
 *   await query                                                 → { data, error }
 *
 * query 자체가 Promise처럼 동작해야 하므로 queryBuilder 객체에
 * then/catch/finally를 달아 thenable로 만든다.
 */
const createPushSubsSupabase = (resolvedValue: { data: unknown[] | null; error: unknown }) => {
  // queryBuilder: thenable + .in() 체이닝 지원
  const queryBuilder = {
    in: jest.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(resolvedValue).catch(reject),
    finally: (fn: () => void) => Promise.resolve(resolvedValue).finally(fn),
  };

  const supabase = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(queryBuilder),
    }),
  } as unknown as SupabaseClient;

  return { supabase, queryBuilder };
};

// 테스트용 더미 페이로드
const dummyPayload = {
  title: "테스트 알림",
  body: "본문 내용",
};

// 테스트용 더미 구독 레코드 팩토리
const makeSubscription = (userId: string, index = 0) => ({
  id: `sub-${index}`,
  user_id: userId,
  endpoint: `https://fcm.example.com/sub-${index}`,
  p256dh_key: `p256dh-${index}`,
  auth_key: `auth-${index}`,
});

// -------------------------
// 테스트 스위트
// -------------------------

describe("sendPushDirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- 정상 경로 ----

  describe("구독자가 없는 경우", () => {
    it("{ total: 0, successful: 0, failed: 0 }을 반환하고 sendNotification을 호출하지 않는다", async () => {
      const { supabase } = createPushSubsSupabase({ data: [], error: null });

      const result = await sendPushDirect(supabase, dummyPayload);

      expect(result).toEqual({ total: 0, successful: 0, failed: 0 });
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("data가 null일 때도 { total: 0, successful: 0, failed: 0 }을 반환한다", async () => {
      const { supabase } = createPushSubsSupabase({ data: null, error: null });

      const result = await sendPushDirect(supabase, dummyPayload);

      expect(result).toEqual({ total: 0, successful: 0, failed: 0 });
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe("전체 사용자 전송 (userIds 미전달)", () => {
    it("모든 구독자에게 전송하고 total/successful을 정확히 집계한다", async () => {
      const subs = [makeSubscription("user-A", 0), makeSubscription("user-B", 1)];
      const { supabase, queryBuilder } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      const result = await sendPushDirect(supabase, dummyPayload);

      // .in()은 userIds 없을 때 호출되어선 안 됨
      expect(queryBuilder.in).not.toHaveBeenCalled();
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ total: 2, successful: 2, failed: 0 });
    });
  });

  // ---- userIds 필터 ----

  describe("userIds 필터 적용", () => {
    it("userIds가 전달되면 .in('user_id', userIds)를 호출한다", async () => {
      const subs = [makeSubscription("user-A", 0)];
      const { supabase, queryBuilder } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      await sendPushDirect(supabase, dummyPayload, ["user-A"]);

      expect(queryBuilder.in).toHaveBeenCalledWith("user_id", ["user-A"]);
    });

    it("userIds 빈 배열 전달 시 전체 구독자에게 전송된다", async () => {
      const subs = [makeSubscription("user-A", 0), makeSubscription("user-B", 1)];
      const { supabase, queryBuilder } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      const result = await sendPushDirect(supabase, dummyPayload, []);

      expect(queryBuilder.in).not.toHaveBeenCalled();
      expect(result).toEqual({ total: 2, successful: 2, failed: 0 });
    });

    it("여러 userId 전달 시 .in()에 배열이 그대로 전달된다", async () => {
      const subs = [makeSubscription("user-A", 0), makeSubscription("user-B", 1)];
      const { supabase, queryBuilder } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      await sendPushDirect(supabase, dummyPayload, ["user-A", "user-B"]);

      expect(queryBuilder.in).toHaveBeenCalledWith("user_id", ["user-A", "user-B"]);
    });
  });

  // ---- Supabase 쿼리 에러 ----

  describe("Supabase 쿼리 에러", () => {
    it("쿼리 에러 발생 시 그 에러를 throw한다", async () => {
      const dbError = { message: "connection refused", code: "PGRST503" };
      const { supabase } = createPushSubsSupabase({ data: null, error: dbError });

      await expect(sendPushDirect(supabase, dummyPayload)).rejects.toMatchObject(dbError);
    });

    it("에러 throw 후 sendNotification은 호출되지 않는다", async () => {
      const { supabase } = createPushSubsSupabase({ data: null, error: { message: "DB 오류" } });

      await expect(sendPushDirect(supabase, dummyPayload)).rejects.toBeDefined();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  // ---- partial success (Promise.allSettled) ----

  describe("일부 전송 실패 (partial success)", () => {
    it("일부 sendNotification이 reject되면 failed 카운트에 반영된다", async () => {
      const subs = [makeSubscription("user-A", 0), makeSubscription("user-B", 1), makeSubscription("user-C", 2)];
      const { supabase } = createPushSubsSupabase({ data: subs, error: null });

      // 첫 번째는 성공, 두 번째는 실패, 세 번째는 성공
      mockSendNotification
        .mockResolvedValueOnce({ statusCode: 201 })
        .mockRejectedValueOnce(new Error("410 Gone — expired subscription"))
        .mockResolvedValueOnce({ statusCode: 201 });

      const result = await sendPushDirect(supabase, dummyPayload);

      expect(result).toEqual({ total: 3, successful: 2, failed: 1 });
    });

    it("모든 sendNotification이 실패하면 successful: 0을 반환한다", async () => {
      const subs = [makeSubscription("user-A", 0), makeSubscription("user-B", 1)];
      const { supabase } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockRejectedValue(new Error("push service unreachable"));

      const result = await sendPushDirect(supabase, dummyPayload);

      expect(result).toEqual({ total: 2, successful: 0, failed: 2 });
    });

    it("전부 실패해도 Promise 자체는 reject되지 않는다 (allSettled 보장)", async () => {
      const subs = [makeSubscription("user-X", 0)];
      const { supabase } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockRejectedValue(new Error("fatal push error"));

      // sendPushDirect는 throw하지 않아야 함
      await expect(sendPushDirect(supabase, dummyPayload)).resolves.toEqual({
        total: 1,
        successful: 0,
        failed: 1,
      });
    });
  });

  // ---- 페이로드 직렬화 ----

  describe("페이로드 직렬화", () => {
    it("icon/badge/tag 미전달 시 기본값이 JSON 문자열에 포함된다", async () => {
      const subs = [makeSubscription("user-A", 0)];
      const { supabase } = createPushSubsSupabase({ data: subs, error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      await sendPushDirect(supabase, { title: "알림", body: "내용" });

      const calledPayload = JSON.parse(mockSendNotification.mock.calls[0][1]);
      expect(calledPayload.icon).toBe("/icons/icon-192x192.png");
      expect(calledPayload.badge).toBe("/icons/icon-192x192.png");
      expect(calledPayload.tag).toBe("hankki-stock-notification");
      expect(calledPayload.data).toEqual({});
    });

    it("구독 레코드의 endpoint/p256dh_key/auth_key가 sendNotification에 올바르게 전달된다", async () => {
      const sub = makeSubscription("user-A", 0);
      const { supabase } = createPushSubsSupabase({ data: [sub], error: null });

      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      await sendPushDirect(supabase, dummyPayload);

      expect(mockSendNotification).toHaveBeenCalledWith(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        expect.any(String)
      );
    });
  });
});
