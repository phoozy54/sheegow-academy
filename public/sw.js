// SHEEGOW ACADEMY — Service Worker for PWA
// Enables offline caching, push notifications, and installability

const CACHE_NAME = "sheegow-v2";
const OFFLINE_URL = "/";

// Core assets to cache on install
const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// Cache core assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => undefined);
    })
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first strategy for pages, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API calls and WebSocket
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.hostname.includes("sheegow-chat") || url.hostname.includes("cloudinary")) {
    return;
  }

  // Cache-first for static assets (images, fonts, CSS, JS)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Push notification support
self.addEventListener("push", (event) => {
  let data = { title: "SHEEGOW ACADEMY", body: "You have a new notification" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    // Keep default
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
      tag: "sheegow-notification",
      renotify: true,
    })
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data?.url || "/";
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle background sync (for offline form submissions)
self.addEventListener("sync", (event) => {
  if (event.tag === "sheegow-sync") {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "BACKGROUND_SYNC" });
        });
      })
    );
  }
});
