"use client";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useUser();

  // 브라우저 지원 여부 확인
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // 기존 구독 정보 가져오기
  const getSubscription = useCallback(async () => {
    if (!isSupported || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      setSubscription(existingSubscription);

      // 서버에 구독 정보 저장
      if (existingSubscription) {
        try {
          await saveSubscriptionToServer(existingSubscription);
        } catch (saveError) {
          console.error("구독 정보 저장 실패:", saveError);
          // 저장 실패해도 구독 정보는 유지
        }
      }
    } catch (error) {
      console.error("구독 정보 가져오기 오류:", error);
    } finally {
      setLoading(false);
    }
  }, [isSupported, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // isSupported와 user?.id가 모두 준비되었을 때만 실행
    if (isSupported && user?.id) {
      getSubscription();
    } else {
      setLoading(false);
    }
  }, [isSupported, user?.id, getSubscription]);

  // ArrayBuffer -> base64url 문자열로 변환
  const arrayBufferToBase64Url = useCallback((buffer: ArrayBuffer | null): string | null => {
    if (!buffer) return null;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    // base64
    const base64 = typeof window !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
    // base64url 로 변환(+/ -> -_, 제거=)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }, []);

  // base64url 문자열 -> Uint8Array (VAPID 공개키용)
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = typeof window !== "undefined" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // 서버에 구독 정보 저장
  const saveSubscriptionToServer = useCallback(
    async (subscription: PushSubscription) => {
      if (!user?.id) return;

      try {
        const p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"));
        const auth = arrayBufferToBase64Url(subscription.getKey("auth"));

        console.log("구독 정보 저장 시도:", {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dh ? "있음" : "없음",
          auth: auth ? "있음" : "없음",
        });

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh_key: p256dh ?? undefined,
            auth_key: auth ?? undefined,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,endpoint",
            ignoreDuplicates: false,
          }
        );

        if (error) {
          console.error("구독 정보 저장 오류 상세:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });

          // 중복 충돌(409)은 이미 저장된 것으로 간주하고 무시
          if (
            (error as { code?: string; hint?: string; message?: string }).code === "23505" ||
            (error as { code?: string; hint?: string; message?: string }).hint?.includes("duplicate key") ||
            (error as { code?: string; hint?: string; message?: string }).message?.includes("duplicate")
          ) {
            console.warn("구독 정보 중복, 무시합니다.");
            return;
          }
          console.error("구독 정보 저장 실패:", error);
          return;
        }

        console.log("구독 정보 저장 성공");
      } catch (error) {
        console.error("구독 정보 저장 중 오류:", error);
        // 오류를 throw하지 않고 로그만 출력
      }
    },
    [user?.id, arrayBufferToBase64Url]
  );

  // 푸시 알림 권한 요청
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === "granted";
    } catch (error) {
      console.error("권한 요청 오류:", error);
      return false;
    }
  };

  // 푸시 구독 생성 (Service Worker 방식)
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      console.log("구독 조건 불만족:", { isSupported, userId: user?.id });
      return false;
    }

    setLoading(true);
    try {
      // 권한 확인
      if (permission !== "granted") {
        console.log("권한 요청 시작...");
        const granted = await requestPermission();
        if (!granted) {
          console.log("권한 거부됨");
          setLoading(false);
          return false;
        }
        console.log("권한 허용됨");
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error("VAPID 공개키가 설정되지 않음");
        setLoading(false);
        return false;
      }

      console.log("VAPID 공개키 확인됨:", `${vapidPublicKey.substring(0, 20)}...`);

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log("구독 생성 시작...");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      console.log("구독 생성 성공:", subscription.endpoint);
      setSubscription(subscription);

      console.log("서버에 구독 정보 저장 시작...");
      await saveSubscriptionToServer(subscription);
      console.log("구독 완료!");

      return true;
    } catch (error) {
      console.error("구독 생성 오류:", error);
      if (error instanceof Error) {
        console.error("오류 상세:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 푸시 구독 해제
  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);

      // 서버에서 현재 엔드포인트만 삭제 (다른 기기 구독 보존)
      if (subscription.endpoint) {
        const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        if (error) {
          console.error("구독 정보 삭제 오류:", error);
        }
      }

      return true;
    } catch (error) {
      console.error("구독 해제 오류:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    getSubscription,
    isSubscribed: !!subscription,
  };
}
