/// <reference lib="webworker" />
export {};

const sw = self as unknown as ServiceWorkerGlobalScope;
// 버전 토큰(캐시 무효화용)
// 변경 시 Service Worker가 새로 활성화됩니다.
sw.addEventListener("install", (_event: ExtendableEvent) => {
  // 즉시 활성화 대기열 진입
  sw.skipWaiting();
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  // 모든 클라이언트 제어
  event.waitUntil(sw.clients.claim());
});

// 푸시 이벤트 처리
sw.addEventListener("push", (event: PushEvent) => {
  console.log("custom worker 작동");
  try {
    const data = event?.data ? event.data.json() : {};
    const title = data.title || "알림";
    const options: NotificationOptions = {
      body: data.body || "새 알림이 있습니다",
      // icon: data.icon || "/icons/icon-192x192.png",
      // badge: data.badge || "/icons/icon-48x48.png",
      // tag: data.tag || "stock-cock-notification",
      data: data.data || {},
      requireInteraction: false,
      silent: false,
    };
    console.log(options);
    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (err) {
    const text = event?.data ? event.data.text() : "새 알림이 있습니다";
    event.waitUntil(sw.registration.showNotification("알림", { body: text }));
  }
});

// 알림 클릭 처리
sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await sw.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      const client = clients.find((c) => "focus" in c) as WindowClient | undefined;
      if (client) {
        await client.focus();
      } else {
        await sw.clients.openWindow("/");
      }
    })()
  );
});
