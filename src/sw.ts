
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
  navigationPreload: false, // Désactivé pour corriger ERR_FAILED
  runtimeCaching: [
    // 1. Pages critiques : Toujours accessibles
    {
      matcher: ({ url }) => ["/", "/login", "/autoriser", "/offline"].includes(url.pathname),
      handler: "NetworkFirst", // Priorité réseau pour éviter les blocages de redirection
      options: {
        cacheName: "critical-pages",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24, // 24h
        },
      },
    },
    // 2. Assets statiques
    {
      matcher: /\/(_next\/static|static|manifest\.json|icon\.svg)/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
      },
    },
    // 3. Images externes
    {
      matcher: /^https:\/\/(images\.unsplash\.com|picsum\.photos)\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "images-cache",
      },
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
