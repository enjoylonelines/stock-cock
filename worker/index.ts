/// <reference lib="webworker" />
export {};

// 푸시 알림 데이터 타입 정의
interface PushEventType {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;

  actions?: Array<{
    action: string;
    title: string;
  }>;
}

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
  console.log("🔥 PUSH 이벤트 수신됨!", event);
  console.log("🔥 이벤트 데이터:", event.data);
  console.log("🔥 이벤트 데이터 타입:", typeof event.data);
  console.log("🔥 이벤트 데이터 null 체크:", event.data === null);

  try {
    let data: PushEventType = {};

    // 데이터가 있는지 확인하고 적절한 방법으로 파싱
    if (event.data) {
      console.log("🔥 이벤트 데이터 존재 - 파싱 시도");
      try {
        // JSON으로 파싱 시도
        data = event.data.json();
        console.log("🔥 JSON 파싱 성공:", data);
      } catch (jsonError) {
        // JSON 파싱 실패 시 텍스트로 파싱
        const text = event.data.text();
        console.log("🔥 JSON 파싱 실패, 텍스트로 파싱:", text);

        // 텍스트가 있으면 기본 알림으로 표시
        if (text) {
          event.waitUntil(
            sw.registration.showNotification("알림", {
              body: text,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-48x48.png",
            })
          );
          return;
        }
      }
    } else {
      console.log("🔥 이벤트 데이터가 null 또는 undefined - 기본 알림 표시");
      // 데이터가 없으면 기본 알림 표시
      event.waitUntil(
        sw.registration.showNotification("알림", {
          body: "새 알림이 있습니다",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-48x48.png",
        })
      );
      return;
    }

    console.log("🔥 최종 파싱된 데이터:", data);

    const title = data.title || "알림";
    const options: NotificationOptions = {
      body: data.body || "새 알림이 있습니다",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-48x48.png",
      tag: data.tag || "stock-cock-notification",

      requireInteraction: false,
      silent: false,
    };

    console.log("🔥 알림 표시 시도:", title, options);
    event.waitUntil(sw.registration.showNotification(title, options));
    console.log("🔥 알림 표시 완료");
  } catch (err) {
    console.error("🔥 푸시 이벤트 처리 오류:", err);
    // 최후의 수단으로 기본 알림 표시
    event.waitUntil(
      sw.registration.showNotification("알림", {
        body: "새 알림이 있습니다",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-48x48.png",
      })
    );
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
