"use client";

import { useEffect } from "react";

/**
 * PWA: 새 Service Worker가 적용되면 페이지를 새로고침해서
 * 캐시된 구버전 코드 대신 최신 코드를 쓰도록 함.
 * (PWA 재설치 없이 배포 후에도 오류 방지)
 */
export function ServiceWorkerReload() {
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.serviceWorker) return;

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
