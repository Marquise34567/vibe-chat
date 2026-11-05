// FaceFrenzy service worker — exists solely for Web Push ("someone's
// online" pings). Payload-free pushes: the server sends a VAPID tickle,
// we decide what to show here.

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("Someone's on FaceFrenzy", {
      body: "A stranger just started searching — come say hi.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "ff-pool-ping",
      renotify: true,
      data: { url: "/?from=push" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ("focus" in c) {
            c.navigate(target);
            return c.focus();
          }
        }
        return clients.openWindow(target);
      })
  );
});
