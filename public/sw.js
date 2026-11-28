// SHEEGOW ACADEMY — PWA service worker (G1 / SW-1)
//
// Rules (do not relax without a reviewed change):
//   - Only public pages are ever cached. Auth/dashboard/checkout/etc. are
//     never written to Cache Storage, even on a shared device.
//   - Responses with private / no-store / no-cache or Set-Cookie are never cached.
//   - /api/*, the chat service and Cloudinary are never intercepted.
//   - logout / change-password ask this worker to purge the app caches. A
//     generation token prevents an in-flight fetch from recreating them.
//   - notification URLs are confined to our own origin.

const CACHE_NAME = "sheegow-v3";
const CACHE_PREFIX = "sheegow-";
const OFFLINE_URL = "/";

// Bumped on purge; every async cache write checks it before calling put().
let cacheGeneration = 0;

const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-app.png",
];

// Explicit allow-list. Anything not listed is online-only.
const PUBLIC_PAGES = new Set([
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/teach",
  "/live-classes",
  "/calendar",
  "/leaderboard",
  "/courses",
  "/search",
  "/barashada-ingiriisiga-online",
  "/english-beginners",
  "/english-classes-for-somalis",
  "/ielts-somali",
  "/ingiriis-ku-hadal",
  "/koorso-ingiriisi-hargeisa",
]);

function isPublicPage(pathname) {
  if (PUBLIC_PAGES.has(pathname)) return true;
  // Public course detail pages are SEO pages: /courses/[slug].
  return pathname.startsWith("/courses/") && !pathname.includes("/export");
}

const ASSET_PATTERN =
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js|map)$/;

function mayCacheResponse(response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return false;
  }
  const cacheControl = response.headers.get("cache-control") || "";
  if (/\b(?:no-store|private|no-cache)\b/i.test(cacheControl)) return false;
  if (response.headers.has("set-cookie")) return false;
  return true;
}

/**
 * Cache a response only if the cache generation has not changed since the
 * fetch started. This stops a request begun before logout from recreating a
 * purged cache. Called inside event.waitUntil so the worker stays alive.
 */
async function putIfCurrent(request, response, generation) {
  if (generation !== cacheGeneration) return;
  try {
    if (!(await caches.has(CACHE_NAME))) return;
    if (generation !== cacheGeneration) return;
    const cache = await caches.open(CACHE_NAME);
    if (generation !== cacheGeneration) return;
    await cache.put(request, response);
  } catch {
    /* storage disabled / quota — caching is best-effort */
  }
}

function internalUrl(value) {
  try {
    const url = new URL(value || "/", self.location.origin);
    if (url.origin !== self.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

self.addEventListener("install", (event) => {
  const generation = cacheGeneration;
  event.waitUntil(
    (async () => {
      await Promise.all(
        CORE_ASSETS.map(async (asset) => {
          try {
            // The same guard as runtime caching — addAll() would ignore it.
            const response = await fetch(asset, { cache: "no-store" });
            if (mayCacheResponse(response)) {
              await putIfCurrent(asset, response.clone(), generation);
            }
          } catch {
            /* unavailable asset — skip, do not break install */
          }
        }),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Called by the client after logout / change-password.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_PURGE") return;
  // Only a controlled window client may purge.
  if (!event.source || event.source.type !== "window" || !event.source.id) return;

  event.waitUntil(
    clients.get(event.source.id).then((client) => {
      if (!client) return undefined;
      cacheGeneration += 1;
      return caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .map((key) => caches.delete(key)),
        ),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("sheegow-chat") ||
    url.hostname.includes("cloudinary")
  ) {
    return;
  }

  const generation = cacheGeneration;

  // Static assets: cache-first, but only cacheable responses.
  if (ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (mayCacheResponse(response)) {
            event.waitUntil(putIfCurrent(request, response.clone(), generation));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Public pages only: network-first with an offline fallback.
  if (!isPublicPage(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (mayCacheResponse(response)) {
          event.waitUntil(putIfCurrent(request, response.clone(), generation));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)),
      ),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "SHEEGOW ACADEMY", body: "You have a new notification" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    // Keep the safe default.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "SHEEGOW ACADEMY", {
      body: data.body || "You have a new notification",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: internalUrl(data.url) },
      tag: "sheegow-notification",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(internalUrl(event.notification.data?.url), self.location.origin);
  const targetPath = target.pathname + target.search + target.hash;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        try {
          const clientUrl = new URL(client.url);
          if (
            clientUrl.origin === self.location.origin &&
            clientUrl.pathname + clientUrl.search + clientUrl.hash === targetPath &&
            "focus" in client
          ) {
            return client.focus();
          }
        } catch {
          /* skip malformed client URL */
        }
      }
      if (clients.openWindow) return clients.openWindow(targetPath);
      return undefined;
    }),
  );
});

// Kept for API compatibility; no background POSTs are made by this worker.
self.addEventListener("sync", (event) => {
  if (event.tag === "sheegow-sync") {
    event.waitUntil(
      clients.matchAll().then((list) => {
        for (const client of list) {
          client.postMessage({ type: "BACKGROUND_SYNC" });
        }
      }),
    );
  }
});
