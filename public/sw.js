const CACHE_NAME = 'miranda-sport-v1.0.6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/variables.css?v=1.0.4',
  '/css/main.css?v=1.0.4',
  '/css/ecommerce.css?v=1.0.4',
  '/css/dashboard.css?v=1.0.4',
  '/js/api.js?v=1.0.6',
  '/js/ui.js?v=1.0.6',
  '/js/app.js?v=1.0.6',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event: Cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app assets');
      // Use Map to handle cache installation gracefully even if some files fail
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[Service Worker] Failed to cache resource: ${url}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache first or Network fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip API or external resources
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Skip browser extension requests or non-http protocols
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache if connected
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Ignore offline fetch errors for cache updates */ });
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Offline fallback for html navigation
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
