// Service Worker - Version 1.0.1
const CACHE_VERSION = "directorio-v1.0.1";
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_IMAGES = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
  "/",
  "/negocios",
  "/favoritos",
  "/para-negocios",
  "/offline",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((error) => {
        console.error("[SW] Failed to precache", error);
      })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC && key !== CACHE_IMAGES) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      )
    )
  );

  return self.clients.claim();
});

function getCacheStrategy(url) {
  const urlObj = new URL(url);

  if (urlObj.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)) {
    return "cache-first";
  }

  if (
    urlObj.pathname.endsWith("/") ||
    urlObj.pathname.endsWith(".html") ||
    !urlObj.pathname.includes(".")
  ) {
    return "network-first";
  }

  if (urlObj.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/i)) {
    return "cache-first";
  }

  return "network-first";
}

async function networkFirst(request, cacheName, timeout = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      return caches.match("/offline");
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && response.status === 200) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const cache = caches.open(cacheName);
        cache.then((instance) => instance.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.origin !== location.origin &&
    !url.hostname.includes("cloudinary.com") &&
    !url.hostname.includes("firebaseapp.com")
  ) {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  // Leave live APIs untouched. The app should talk to the network directly.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  const strategy = getCacheStrategy(request.url);

  if (strategy === "network-first") {
    event.respondWith(networkFirst(request, CACHE_STATIC));
  } else if (strategy === "cache-first") {
    const cacheName = url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)
      ? CACHE_IMAGES
      : CACHE_STATIC;
    event.respondWith(cacheFirst(request, cacheName));
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keyList) => Promise.all(keyList.map((key) => caches.delete(key))))
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "YajaGon", body: "Nueva notificacion" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/images/icon-192.png",
    badge: "/images/badge-72.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "notification",
    requireInteraction: false,
    data: data.url || "/",
    actions: [
      { action: "open", title: "Ver", icon: "/images/icon-192.png" },
      { action: "close", title: "Cerrar", icon: "/images/icon-192.png" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const urlToOpen = event.notification.data || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (let index = 0; index < clientList.length; index += 1) {
        const client = clientList[index];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return undefined;
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reviews" || event.tag === "sync-favorites") {
    event.waitUntil(Promise.resolve());
  }
});
