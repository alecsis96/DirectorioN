const CACHE_NAME = 'directorio-yajalon-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';
const OFFLINE_PAGE = '/offline.html';

// Archivos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/negocios',
  '/favoritos',
  '/para-negocios',
  '/manifest.json',
  '/images/logo.png',
  '/offline.html',
];

// Instalar service worker y cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => {
          console.error('Service Worker: Error caching static assets', err);
        });
    })
  );
  self.skipWaiting();
});

// Activar service worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de caché: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que no sean GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar requests a APIs externas (Firebase, Cloudinary, etc.)
  if (
    url.origin.includes('firebase') ||
    url.origin.includes('cloudinary') ||
    url.origin.includes('stripe') ||
    url.origin.includes('google') ||
    url.origin.includes('gstatic')
  ) {
    return;
  }

  // Estrategia Network First para páginas HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar la respuesta para guardar en caché
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde caché
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Página offline personalizada
            return caches.match(OFFLINE_PAGE);
          });
        })
    );
    return;
  }

  // Cache First para imágenes y assets estáticos
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Solo cachear respuestas exitosas
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para todo lo demás, Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en background (cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Service Worker: Syncing data...');
  // Aquí puedes implementar lógica para sincronizar datos
  // cuando la conexión se restablezca
}

// Notificaciones push (opcional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Directorio Yajalón';
  const options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});
