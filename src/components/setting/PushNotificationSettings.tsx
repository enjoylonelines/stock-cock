"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, CheckCircle, XCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushNotificationSettings() {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const [isEnabled, setIsEnabled] = useState(isSubscribed);

  const handleToggle = async () => {
    if (isEnabled) {
      const success = await unsubscribe();
      if (success) {
        setIsEnabled(false);
      }
    } else {
      const success = await subscribe();
      if (success) {
        setIsEnabled(true);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex gap-2 items-center text-yellow-800">
          <BellOff className="w-5 h-5" />
          <span className="font-medium">푸시 알림을 지원하지 않는 브라우저입니다</span>
        </div>
        <p className="mt-2 text-sm text-yellow-700">Chrome, Firefox, Safari 등 최신 브라우저를 사용해주세요.</p>
      </div>
    );
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case "granted":
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          text: "허용됨",
          color: "text-green-700",
        };
      case "denied":
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          text: "차단됨",
          color: "text-red-700",
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-gray-500" />,
          text: "요청 필요",
          color: "text-gray-700",
        };
    }
  };

  const permissionStatus = getPermissionStatus();

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
        <Switch checked={isEnabled} onCheckedChange={handleToggle} disabled={loading || permission === "denied"} />
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">권한 상태</span>
          <div className={`flex items-center gap-2 ${permissionStatus.color}`}>
            {permissionStatus.icon}
            <span className="text-sm">{permissionStatus.text}</span>
          </div>
        </div>

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

            {/* 테스트용 버튼 (개발 환경에서만 표시) */}
            {
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/push/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: "🧪 테스트 알림",
                          body: "개발 서버에서 푸시 알림 테스트입니다!",
                          //icon: "/icons/logo-192x192.png",
                        }),
                      });
                      const result = await response.json();
                      console.log("푸시 테스트 결과:", result);
                    } catch (error) {
                      console.error("테스트 알림 전송 실패:", error);
                      alert("테스트 알림 전송 실패");
                    }
                  }}
                >
                  🧪 테스트 알림 보내기
                </Button>
              </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
