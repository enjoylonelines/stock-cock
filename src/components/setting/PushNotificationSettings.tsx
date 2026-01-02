"use client";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MANUALLY_DISABLED_KEY = "push-notification-manually-disabled";

export default function PushNotificationSettings() {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe, getSubscription } = usePushNotifications();

  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isManuallyDisabled, setIsManuallyDisabled] = useState(false);
  const isInitialMount = useRef(true);

  // isEnabled는 isSubscribed와 동일하게 사용
  const isEnabled = isSubscribed;

  // localStorage에서 수동으로 비활성화했는지 확인
  useEffect(() => {
    if (typeof window !== "undefined") {
      const manuallyDisabled = localStorage.getItem(MANUALLY_DISABLED_KEY) === "true";
      setIsManuallyDisabled(manuallyDisabled);
    }
  }, []);

  // 일정 시간마다 구독 상태 자동 확인 (5분마다)
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      if (isSupported && permission === "granted" && !isManuallyDisabled) {
        await getSubscription();
        setLastChecked(new Date());
      }
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(checkInterval);
  }, [isSupported, permission, getSubscription, isManuallyDisabled]);

  // 권한이 허용되었는데 구독이 안 되어 있으면 자동 구독 시도
  // 단, 사용자가 명시적으로 구독을 해제한 경우는 제외
  useEffect(() => {
    // 초기 마운트 시에는 실행하지 않음 (사용자 액션 없이 자동 구독 방지)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const autoSubscribe = async () => {
      // 사용자가 명시적으로 구독을 해제한 경우 자동 구독하지 않음
      if (isManuallyDisabled) {
        return;
      }

      if (isSupported && permission === "granted" && !isSubscribed && !loading) {
        await subscribe();
      }
    };

    autoSubscribe();
  }, [isSupported, permission, isSubscribed, loading, subscribe, isManuallyDisabled]);

  const handleToggle = async () => {
    console.log("토글 클릭:", { isSubscribed, loading, permission });
    if (isSubscribed) {
      console.log("구독 해제 시도...");
      await unsubscribe();
      // 사용자가 명시적으로 구독을 해제했음을 표시
      if (typeof window !== "undefined") {
        localStorage.setItem(MANUALLY_DISABLED_KEY, "true");
        setIsManuallyDisabled(true);
      }
    } else {
      console.log("구독 시도...");
      // 사용자가 다시 구독을 켰으므로 플래그 제거
      if (typeof window !== "undefined") {
        localStorage.removeItem(MANUALLY_DISABLED_KEY);
        setIsManuallyDisabled(false);
      }
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex gap-2 items-center text-yellow-800">
          <BellOff className="w-5 h-5" />
          <span className="font-medium">푸시 알림을 지원하지 않는 브라우저입니다</span>
        </div>
        <p className="mt-2 text-sm text-yellow-700">
          안드로이드에서는 Chrome, Firefox, Edge, 삼성 인터넷 등의 최신 브라우저를 사용해주세요. 구형 브라우저나 일부 제조사 기본 브라우저는
          지원하지 않을 수 있습니다.
        </p>
      </div>
    );
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case "granted":
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: "허용됨",
          color: "text-green-700",
        };
      case "denied":
        return {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          text: "차단됨",
          color: "text-red-700",
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-gray-500" />,
          text: "요청 필요",
          color: "text-gray-700",
        };
    }
  };

  const permissionStatus = getPermissionStatus();

  // 디버깅 정보
  console.log("PushNotificationSettings 상태:", {
    isSupported,
    permission,
    isSubscribed,
    isEnabled,
    loading,
    disabled: loading || permission === "denied",
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-4 bg-white rounded-lg border">
        <div className="flex gap-3 items-center">
          <Bell className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="font-medium text-gray-900">푸시 알림</h3>
            <p className="text-sm text-gray-500">입출고, 제품 등록 시 알림을 받습니다</p>
          </div>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} disabled={loading} />
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">권한 상태</span>
          <div className={`flex items-center gap-1 ${permissionStatus.color}`}>
            {permissionStatus.icon}
            <span className="text-sm">{permissionStatus.text}</span>
          </div>
        </div>

        {/* 구독 상태 및 마지막 확인 시간 */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">구독 상태</span>
          <div className="flex gap-2 items-center">
            <div className={`flex items-center gap-1 ${isSubscribed ? "text-green-600" : "text-gray-500"}`}>
              {isSubscribed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span className="text-sm">{isSubscribed ? "구독됨" : "구독 안됨"}</span>
            </div>
          </div>
        </div>

        {lastChecked && <div className="mb-2 text-xs text-gray-500">마지막 확인: {lastChecked.toLocaleTimeString()}</div>}

        {permission === "denied" && (
          <div className="p-3 mt-3 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm text-red-700">푸시 알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.</p>
          </div>
        )}

        {permission === "default" && (
          <div className="p-3 mt-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700">푸시 알림을 받으려면 권한을 허용해주세요.</p>
          </div>
        )}

        {isEnabled && (
          <div className="p-3 mt-3 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm text-green-700">푸시 알림이 활성화되었습니다. 입출고 및 제품 등록 시 알림을 받을 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
