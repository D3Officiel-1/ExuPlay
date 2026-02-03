const CACHE_NAME = 'exu-play-v2';
const OFFLINE_URLS = [
  '/',
  '/login',
  '/autoriser',
  '/home',
  '/profil',
  '/parametres',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Stratégie Stale-While-Revalidate pour les pages et les assets statiques
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'style' || 
      event.request.destination === 'script' || 
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Si réseau échoue, le cache est déjà retourné par match()
          });
          return response || fetchPromise;
        });
      })
    );
  }
});
