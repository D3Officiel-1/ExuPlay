
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
    ...defaultCache,
    {
      matcher: /\/(_next\/static|static|manifest\.json|icon\.svg)/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
      },
    },
    {
      matcher: /^https:\/\/images\.unsplash\.com\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "unsplash-images",
      },
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/home") || url.pathname.startsWith("/profil") || url.pathname.startsWith("/parametres"),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "app-pages",
      },
    },
  ],
});

serwist.addEventListeners();
