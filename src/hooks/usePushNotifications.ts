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
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // 기존 구독 정보 가져오기
  const getSubscription = useCallback(async () => {
    if (!isSupported || !user?.id) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      setSubscription(existingSubscription);

      // 서버에 구독 정보 저장
      if (existingSubscription) {
        await saveSubscriptionToServer(existingSubscription);
      }
    } catch (error) {
      console.error("구독 정보 가져오기 오류:", error);
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
        // 중복 충돌(409)은 이미 저장된 것으로 간주하고 무시
        if (
          (error as { code?: string; hint?: string; message?: string }).code === "23505" ||
          (error as { code?: string; hint?: string; message?: string }).hint?.includes("duplicate key") ||
          (error as { code?: string; hint?: string; message?: string }).message?.includes("duplicate")
        ) {
          console.warn("구독 정보 중복, 무시합니다.");
          return;
        }
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

  // 푸시 구독 생성 (Service Worker 방식)
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      return false;
    }

    setLoading(true);
    try {
      // 권한 확인
      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return false;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        setLoading(false);
        return false;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setSubscription(subscription);
      await saveSubscriptionToServer(subscription);
      return true;
    } catch (error) {
      console.error("구독 생성 오류:", error);
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
