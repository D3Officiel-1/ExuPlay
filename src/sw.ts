
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Configuration minimaliste du Service Worker
// Nous avons supprimé toute mise en cache dynamique (runtimeCaching) pour les pages
// afin d'éviter les erreurs ERR_FAILED liées aux redirections et aux cookies.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // Désactivé pour garantir la compatibilité avec les redirections Next.js
});

serwist.addEventListeners();
