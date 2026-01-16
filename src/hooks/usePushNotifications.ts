"use client";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { clientLogger } from "@/utils/client-logger";
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
          clientLogger.error("구독 정보 저장 실패", saveError);
          // 저장 실패해도 구독 정보는 유지
        }
      }
    } catch (error) {
      clientLogger.error("구독 정보 가져오기 오류", error);
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

  // 디바이스 ID 가져오기 또는 생성 (localStorage 기반)
  const getOrCreateDeviceId = useCallback((): string => {
    if (typeof window === "undefined") return "";

    const STORAGE_KEY = "device_id";
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
      // 새로운 디바이스 ID 생성 (UUID v4 형식)
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
  }, []);

  // 디바이스 정보 수집
  const getDeviceInfo = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        device_id: "",
        device_name: "Unknown",
        user_agent: "",
        platform: "Unknown",
      };
    }

    const deviceId = getOrCreateDeviceId();
    const userAgent = navigator.userAgent;

    // 디바이스 이름 생성 (브라우저 + OS 정보)
    let deviceName = "Unknown Device";
    let platform = "Unknown";

    // OS 감지
    if (userAgent.includes("Windows")) {
      platform = "Windows";
      deviceName = "Windows PC";
    } else if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) {
      platform = "macOS";
      deviceName = "Mac";
    } else if (userAgent.includes("Linux")) {
      platform = "Linux";
      deviceName = "Linux PC";
    } else if (userAgent.includes("Android")) {
      platform = "Android";
      deviceName = "Android Device";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      platform = "iOS";
      deviceName = userAgent.includes("iPad") ? "iPad" : "iPhone";
    }

    // 브라우저 정보 추가
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      deviceName += " (Chrome)";
    } else if (userAgent.includes("Firefox")) {
      deviceName += " (Firefox)";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      deviceName += " (Safari)";
    } else if (userAgent.includes("Edg")) {
      deviceName += " (Edge)";
    }

    return {
      device_id: deviceId,
      device_name: deviceName,
      user_agent: userAgent,
      platform: platform,
    };
  }, [getOrCreateDeviceId]);

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
        const deviceInfo = getDeviceInfo();

        clientLogger.debug("구독 정보 저장 시도", {
          userId: user.id,
          endpoint: subscription.endpoint,
          deviceId: deviceInfo.device_id,
          deviceName: deviceInfo.device_name,
        });

        // 먼저 기존 구독 확인 (같은 디바이스의 다른 endpoint가 있을 수 있음)
        const { data: existingSubscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("device_id", deviceInfo.device_id);

        // 같은 디바이스의 기존 구독이 있으면 삭제 (디바이스당 하나의 구독만 유지)
        if (existingSubscriptions && existingSubscriptions.length > 0) {
          const oldEndpoints = existingSubscriptions
            .map(sub => sub.endpoint)
            .filter(endpoint => endpoint !== subscription.endpoint);

          if (oldEndpoints.length > 0) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", user.id)
              .eq("device_id", deviceInfo.device_id)
              .in("endpoint", oldEndpoints);
            clientLogger.debug(`기존 구독 ${oldEndpoints.length}개 삭제 (같은 디바이스)`);
          }
        }

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh_key: p256dh ?? undefined,
            auth_key: auth ?? undefined,
            device_id: deviceInfo.device_id,
            device_name: deviceInfo.device_name,
            user_agent: deviceInfo.user_agent,
            platform: deviceInfo.platform,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,endpoint",
            ignoreDuplicates: false,
          }
        );

        if (error) {
          clientLogger.error("구독 정보 저장 오류", error, {
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
            clientLogger.debug("구독 정보 중복, 무시합니다.");
            return;
          }
          clientLogger.error("구독 정보 저장 실패", error);
          return;
        }

        clientLogger.debug("구독 정보 저장 성공 (디바이스 정보 포함)");
      } catch (error) {
        clientLogger.error("구독 정보 저장 중 오류", error);
        // 오류를 throw하지 않고 로그만 출력
      }
    },
    [user?.id, arrayBufferToBase64Url, getDeviceInfo]
  );

  // 푸시 알림 권한 요청
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === "granted";
    } catch (error) {
      clientLogger.error("권한 요청 오류", error);
      return false;
    }
  };

  // 푸시 구독 생성 (Service Worker 방식)
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      clientLogger.debug("구독 조건 불만족", { isSupported, userId: user?.id });
      return false;
    }

    setLoading(true);
    try {
      // 권한 확인 (항상 최신 상태 확인)
      const currentPermission = typeof window !== "undefined" ? Notification.permission : permission;
      if (currentPermission !== "granted") {
        clientLogger.debug("권한 요청 시작");
        const granted = await requestPermission();
        if (!granted) {
          clientLogger.debug("권한 거부됨");
          setLoading(false);
          return false;
        }
        clientLogger.debug("권한 허용됨");
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        clientLogger.error("VAPID 공개키가 설정되지 않음");
        setLoading(false);
        return false;
      }

      clientLogger.debug("VAPID 공개키 확인됨", `${vapidPublicKey.substring(0, 20)}...`);

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      clientLogger.debug("구독 생성 시작");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      clientLogger.debug("구독 생성 성공", subscription.endpoint);
      setSubscription(subscription);

      clientLogger.debug("서버에 구독 정보 저장 시작");
      await saveSubscriptionToServer(subscription);
      clientLogger.debug("구독 완료");

      return true;
    } catch (error) {
      clientLogger.error("구독 생성 오류", error);
      if (error instanceof Error) {
        clientLogger.error("오류 상세", error, {
          name: error.name,
          message: error.message,
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 푸시 구독 해제
  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);
    try {
      // 브라우저에서 구독 해제 (subscription이 있는 경우)
      if (subscription) {
        try {
          await subscription.unsubscribe();
          clientLogger.debug("브라우저 구독 해제 완료");
        } catch (error) {
          clientLogger.error("브라우저 구독 해제 오류", error);
          // 브라우저 구독 해제 실패해도 서버에서 삭제는 진행
        }
        setSubscription(null);
      }

      // 서버에서 현재 디바이스의 구독 삭제 (subscription 유무와 관계없이 항상 실행)
      const deviceInfo = getDeviceInfo();
      if (!user?.id) {
        clientLogger.debug("사용자 ID가 없어 서버 삭제를 건너뜁니다");
        setLoading(false);
        return true;
      }

      // device_id로 삭제 (더 정확한 디바이스별 관리)
      if (deviceInfo.device_id) {
        const { error: deviceError, data } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("device_id", deviceInfo.device_id)
          .select();

        if (deviceError) {
          clientLogger.error("구독 정보 삭제 오류 (device_id)", deviceError);
          // fallback: endpoint로 삭제 시도 (subscription이 있는 경우)
          if (subscription?.endpoint) {
            const { error: endpointError } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", user.id)
              .eq("endpoint", subscription.endpoint);
            if (endpointError) {
              clientLogger.error("구독 정보 삭제 오류 (endpoint)", endpointError);
            } else {
              clientLogger.debug("구독 정보 삭제 성공 (endpoint)");
            }
          }
        } else {
          const deletedCount = data?.length || 0;
          clientLogger.debug(`디바이스 구독 정보 삭제 성공 (${deletedCount}개)`);
        }
      } else if (subscription?.endpoint) {
        // device_id가 없는 경우 endpoint로 삭제 (기존 방식)
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
        if (error) {
          clientLogger.error("구독 정보 삭제 오류 (endpoint)", error);
        } else {
          clientLogger.debug("구독 정보 삭제 성공 (endpoint)");
        }
      } else {
        // subscription도 없고 device_id도 없는 경우, 사용자의 모든 구독 삭제 시도
        const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        if (error) {
          clientLogger.error("구독 정보 삭제 오류 (user_id)", error);
        } else {
          clientLogger.debug("사용자 구독 정보 삭제 성공");
        }
      }

      return true;
    } catch (error) {
      clientLogger.error("구독 해제 오류", error);
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
