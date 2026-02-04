
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Pages autorisées (Whitelist) : Mise en cache pour accès hors-ligne
    {
      matcher: ({ url }) => ["/", "/login", "/autoriser", "/offline"].includes(url.pathname),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "essential-pages-cache",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
        },
      },
    },
    // 2. Interdiction stricte de cache pour toutes les autres pages (Navigation)
    // Cela garantit que /home, /profil, /parametres, etc. ne sont JAMAIS servis depuis le cache.
    {
      matcher: ({ request, url }) => 
        request.mode === 'navigate' && 
        !["/", "/login", "/autoriser", "/offline"].includes(url.pathname),
      handler: "NetworkOnly",
    },
    // 3. Assets statiques (Indispensable pour le rendu de l'interface)
    {
      matcher: /\/(_next\/static|static|manifest\.json|icon\.svg)/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
      },
    },
    // 4. Images externes
    {
      matcher: /^https:\/\/images\.unsplash\.com\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "external-images",
      },
    },
    // 5. Cache par défaut pour le fonctionnement technique de Next.js (chunks, scripts)
    // On le place en dernier pour que nos règles de pages soient prioritaires
    ...defaultCache,
  ],
});

serwist.addEventListeners();
