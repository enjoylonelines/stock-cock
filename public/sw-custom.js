self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  console.log("푸시 이벤트 수신!", data); // 디버깅용
  event.waitUntil(
    self.registration.showNotification(data.title || "알림", {
      body: data.body,
      // icon: data.icon || "/icons/logo-192x192.png",
    })
  );
});
