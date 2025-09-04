// Service Worker 설치 확인
console.log("sw-custom.js 로드됨");

// 푸시 이벤트 리스너 등록
self.addEventListener("push", (event) => {
  console.log("푸시 이벤트 수신!", event);

  try {
    const data = event.data ? event.data.json() : {};
    console.log("푸시 데이터:", data);

    const title = data.title || "알림";
    const options = {
      body: data.body || "새 알림이 있습니다",
      // icon: data.icon || "/icons/icon-192x192.png",
      // badge: data.badge || "/icons/icon-48x48.png",
      tag: data.tag || "stock-cock-notification",
      data: data.data || {},
      requireInteraction: false,
      silent: false,
    };

    console.log("알림 표시:", { title, options });

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("푸시 처리 오류:", error);

    // JSON 파싱 실패 시 텍스트로 처리
    const text = event.data ? event.data.text() : "새 알림이 있습니다";
    event.waitUntil(self.registration.showNotification("알림", { body: text }));
  }
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  console.log("알림 클릭됨:", event);

  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      let client = allClients.find((c) => "focus" in c);

      if (client) {
        await client.focus();
        console.log("기존 창에 포커스");
      } else {
        await self.clients.openWindow("/");
        console.log("새 창 열기");
      }
    })()
  );
});
