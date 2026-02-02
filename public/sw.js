const CACHE_NAME = 'citation-v2-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/login',
  '/autoriser',
  '/random',
  '/manifest.json',
  '/globals.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stratégie : Network First, falling back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request) || caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Optionnel : on pourrait mettre en cache dynamiquement ici
        return fetchResponse;
      });
    }).catch(() => {
      // Pour les images ou autres assets si on est offline
      if (event.request.destination === 'image') {
        return caches.match('/icon?size=192');
      }
    })
  );
});