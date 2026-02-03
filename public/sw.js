
import { defaultCacheOnNavigation, Serwist } from "@serwist/sw";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: defaultCacheOnNavigation,
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/") || 
               url.pathname.startsWith("/home") || 
               url.pathname.startsWith("/login") || 
               url.pathname.startsWith("/profil") || 
               url.pathname.startsWith("/parametres"),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 50,
        },
      },
    },
    {
      matcher: ({ request }) => request.destination === "image" || request.destination === "font",
      handler: "CacheFirst",
      options: {
        cacheName: "assets-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

serwist.addEventListeners();
