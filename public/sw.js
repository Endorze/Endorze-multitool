self.addEventListener("install", (event) => {
  console.log("[sw] installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[sw] activated");
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[sw] push received");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  console.log("[sw] push payload", data);

  event.waitUntil(
    self.registration.showNotification(data.title || "Task reminder", {
      body: data.body || "You have an upcoming task.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[sw] notification clicked");

  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});