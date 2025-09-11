"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const LOCAL_STORAGE_KEY = "push-permission-prompt-dismissed";

export default function PushPermissionPrompt() {
  const { isSupported, permission, requestPermission, subscribe, isSubscribed, loading } = usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 24시간 후 다시 표시하도록 체크
    const lastDismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    const shouldShowAgain = !lastDismissed || Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000; // 24시간

    // 조건: 브라우저 지원 + 권한 default 상태 + 24시간 지남
    if (isSupported && permission === "default" && shouldShowAgain) {
      setOpen(true);
    }
  }, [isSupported, permission]);

  const handleAllow = async () => {
    // 권한 요청 -> 구독 시도
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
      setOpen(false);
      // 허용했으면 더 이상 표시하지 않음
      localStorage.setItem(LOCAL_STORAGE_KEY, Date.now().toString());
    }
  };

  const handleLater = () => {
    setOpen(false);
    // 24시간 후 다시 표시하도록 현재 시간 저장
    localStorage.setItem(LOCAL_STORAGE_KEY, Date.now().toString());
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-3">
          <DialogTitle>푸시 알림을 허용하시겠어요?</DialogTitle>
          <DialogDescription>입출고, 이동, 제품 등록 등 주요 이벤트를 실시간으로 알려드립니다.</DialogDescription>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleLater} disabled={loading}>
              나중에
            </Button>
            <Button onClick={handleAllow} disabled={loading}>
              허용하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
