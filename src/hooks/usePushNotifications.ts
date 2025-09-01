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
    if (!isSupported || !user?.id) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      // 푸시 핸들러 스크립트 등록
      try {
        // @ts-expect-error - 동적 import이므로 타입 체크 무시
        await import("/push-handler.js");
      } catch (error) {
        console.log("푸시 핸들러 로드 실패 (이미 로드됨):", error);
      }

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

  // 서버에 구독 정보 저장
  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.getKey("p256dh"),
          auth_key: subscription.getKey("auth"),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
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
    if (!isSupported || !user?.id) return false;

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
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
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

      // 서버에서 구독 정보 삭제
      if (user?.id) {
        const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
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
