// 푸시 알림 이벤트 리스너
self.addEventListener("push", function (event) {
  console.log("푸시 알림 수신:", event);

  if (event.data) {
    const data = event.data.json();
    console.log("푸시 데이터:", data);

    const options = {
      body: data.body,
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-48x48.png",
      tag: data.tag || "stock-cock-notification",
      data: data.data || {},
      actions: data.actions || [
        {
          action: "view",
          title: "확인",
        },
        {
          action: "close",
          title: "닫기",
        },
      ],
      requireInteraction: true,
      silent: false,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// 알림 클릭 이벤트 리스너
self.addEventListener("notificationclick", function (event) {
  console.log("알림 클릭:", event);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // 앱 열기 또는 포커스
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // 이미 열린 창이 있으면 포커스
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }

      // 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
