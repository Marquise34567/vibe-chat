// FaceFrenzy push worker — "someone's online" pool pings.
// Lives at /ff-push-sw.js because /sw.js is claimed by the ad network's
// in-page-push worker. Payload-free pushes: the match server sends a
// VAPID tickle, we decide what notification to show here.

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("Someone's on FaceFrenzy", {
      body: "People are in the frenzy right now — jump in and match.",
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
