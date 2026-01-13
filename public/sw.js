// Service Worker - Version 1.0.0
const CACHE_VERSION = 'directorio-v1.0.0';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_IMAGES = `${CACHE_VERSION}-images`;

// Archivos críticos para cachear inmediatamente
const STATIC_ASSETS = [
  '/',
  '/negocios',
  '/favoritos',
  '/para-negocios',
  '/offline',
  '/manifest.json',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', event);
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Failed to precache:', err);
      })
  );
  
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', event);
  
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC && key !== CACHE_IMAGES) {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
  );
  
  // Tomar control de todas las páginas inmediatamente
  return self.clients.claim();
});

// Estrategia de caché para diferentes tipos de recursos
function getCacheStrategy(url) {
  const urlObj = new URL(url);
  
  // API y datos dinámicos: Network First
  if (urlObj.pathname.startsWith('/api/')) {
    return 'network-first';
  }
  
  // Imágenes: Cache First
  if (urlObj.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)) {
    return 'cache-first';
  }
  
  // Páginas HTML: Network First con fallback a offline
  if (urlObj.pathname.endsWith('/') || urlObj.pathname.endsWith('.html') || !urlObj.pathname.includes('.')) {
    return 'network-first';
  }
  
  // CSS, JS, fonts: Cache First
  if (urlObj.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/i)) {
    return 'cache-first';
  }
  
  // Por defecto: Network First
  return 'network-first';
}

// Network First Strategy
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
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Si es una navegación y no hay caché, mostrar página offline
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache and network failed:', request.url);
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const cache = caches.open(cacheName);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo cachear requests del mismo origen o recursos externos específicos
  if (url.origin !== location.origin && !url.hostname.includes('cloudinary.com') && !url.hostname.includes('firebaseapp.com')) {
    return;
  }
  
  // Ignorar requests no GET
  if (request.method !== 'GET') {
    return;
  }
  
  const strategy = getCacheStrategy(request.url);
  
  if (strategy === 'network-first') {
    const cacheName = url.pathname.startsWith('/api/') ? CACHE_DYNAMIC : CACHE_STATIC;
    event.respondWith(networkFirst(request, cacheName));
  } else if (strategy === 'cache-first') {
    const cacheName = url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i) ? CACHE_IMAGES : CACHE_STATIC;
    event.respondWith(cacheFirst(request, cacheName));
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
  }
});

// Manejar mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => caches.delete(key)));
      })
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  let data = { title: 'YajaGon', body: 'Nueva notificación' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/images/icon-192.png',
    badge: '/images/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    requireInteraction: false,
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Ver', icon: '/images/icon-192.png' },
      { action: 'close', title: 'Cerrar', icon: '/images/icon-192.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background Sync (para enviar datos cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-reviews' || event.tag === 'sync-favorites') {
    event.waitUntil(
      // Aquí se pueden sincronizar datos pendientes
      Promise.resolve()
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
