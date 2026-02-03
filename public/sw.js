const CACHE_NAME = 'exu-play-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/autoriser',
  '/home',
  '/profil',
  '/parametres',
  '/conditions',
  '/manifest.json',
  '/icon?size=192',
  '/icon?size=512'
];

// Installation : Mise en cache des ressources critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches
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

// Récupération : Stratégie Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // On ne met pas en cache les requêtes vers Firebase ou les APIs externes
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseinstallations.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Si la réponse est valide, on met à jour le cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // En cas d'échec réseau total, on renvoie la version cachée si elle existe
          return cachedResponse;
        });

      // On renvoie la réponse cachée immédiatement, ou on attend le réseau
      return cachedResponse || fetchPromise;
    })
  );
});
