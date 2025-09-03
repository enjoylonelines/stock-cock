"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useUser();

  // 브라우저 지원 여부 확인
  useEffect(() => {
    console.log("=== 브라우저 지원 확인 ===");
    console.log("window 존재:", typeof window !== "undefined");
    console.log("serviceWorker 지원:", "serviceWorker" in navigator);
    console.log("PushManager 지원:", "PushManager" in window);
    console.log("Notification 지원:", "Notification" in window);

    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      console.log("✅ 푸시 알림 지원됨");
      setIsSupported(true);
      setPermission(Notification.permission);
      console.log("현재 권한:", Notification.permission);
    } else {
      console.log("❌ 푸시 알림 미지원");
    }
  }, []);

  // 기존 구독 정보 가져오기
  const getSubscription = useCallback(async () => {
    console.log("=== 기존 구독 정보 확인 ===");
    console.log("isSupported:", isSupported);
    console.log("user?.id:", user?.id);

    if (!isSupported || !user?.id) {
      console.log("❌ 구독 정보 가져오기 조건 불만족");
      return;
    }

    try {
      console.log("🔧 Service Worker ready 대기...");
      const registration = await navigator.serviceWorker.ready;
      console.log("Service Worker 등록됨:", registration);

      // Service Worker가 이미 등록되어 있음 (next.config.ts에서 자동 등록)
      console.log("📱 기존 구독 확인...");
      const existingSubscription = await registration.pushManager.getSubscription();
      console.log("기존 구독:", existingSubscription);
      setSubscription(existingSubscription);

      // 서버에 구독 정보 저장
      if (existingSubscription) {
        console.log("💾 기존 구독 서버에 저장...");
        await saveSubscriptionToServer(existingSubscription);
      } else {
        console.log("ℹ️ 기존 구독 없음");
      }
    } catch (error) {
      console.error("❌ 구독 정보 가져오기 오류:", error);
      if (error instanceof Error) {
        console.error("오류 상세:", error.message);
      }
    }
  }, [isSupported, user?.id]);

  useEffect(() => {
    getSubscription();
  }, [getSubscription]);

  // ArrayBuffer -> base64url 문자열로 변환
  const arrayBufferToBase64Url = (buffer: ArrayBuffer | null): string | null => {
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
  };

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
  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    if (!user?.id) return;

    try {
      const p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"));
      const auth = arrayBufferToBase64Url(subscription.getKey("auth"));
      console.log(p256dh, auth);
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: p256dh ?? undefined,
          auth_key: auth ?? undefined,
          created_at: new Date().toISOString(),
        },
        {
          // 사용자-엔드포인트 복합키 기준으로 병합
          onConflict: "user_id,endpoint",
        }
      );

      if (error) {
        console.error("구독 정보 저장 오류:", error);
      }
    } catch (error) {
      console.error("구독 정보 저장 중 오류:", error);
    }
  };

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

  // 푸시 구독 생성
  const subscribe = async (): Promise<boolean> => {
    console.log("=== 푸시 구독 시작 ===");
    console.log("isSupported:", isSupported);
    console.log("user?.id:", user?.id);
    console.log("permission:", permission);

    if (!isSupported || !user?.id) {
      console.log("❌ 구독 조건 불만족:", { isSupported, userId: user?.id });
      return false;
    }

    setLoading(true);
    try {
      // 권한 확인
      if (permission !== "granted") {
        console.log("🔐 권한 요청 시작...");
        const granted = await requestPermission();
        console.log("권한 요청 결과:", granted);
        if (!granted) {
          console.log("❌ 권한 거부됨");
          setLoading(false);
          return false;
        }
      }

      console.log("🔧 Service Worker 등록 대기...");
      const registration = await navigator.serviceWorker.ready;
      console.log("Service Worker 등록 완료:", registration);

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      console.log("VAPID 공개키:", vapidPublicKey);
      console.log("VAPID 공개키 길이:", vapidPublicKey?.length);

      if (!vapidPublicKey) {
        console.log("❌ VAPID 공개키가 설정되지 않음");
        setLoading(false);
        return false;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log("변환된 applicationServerKey:", applicationServerKey);
      console.log("applicationServerKey 길이:", applicationServerKey.length);

      console.log("📱 PushManager 구독 시작...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log("구독 성공:", subscription);
      console.log("구독 endpoint:", subscription.endpoint);

      setSubscription(subscription);
      console.log("💾 서버에 구독 정보 저장...");
      await saveSubscriptionToServer(subscription);
      console.log("✅ 구독 완료!");
      return true;
    } catch (error) {
      console.error("❌ 구독 생성 오류:", error);
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
    isSubscribed: !!subscription,
  };
}
