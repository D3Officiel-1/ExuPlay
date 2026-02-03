
const CACHE_NAME = 'exu-play-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/home',
  '/profil',
  '/parametres',
  '/autoriser',
  '/conditions',
  '/manifest.json',
  '/icon.svg',
  '/manifest/challenges.svg',
  '/manifest/profile.svg',
  '/manifest/settings.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes vers Firebase et les méthodes non-GET
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('google.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // En cas d'échec réseau, on reste sur le cache
      });

      return cachedResponse || fetchPromise;
    })
  );
});
