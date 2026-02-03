
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Exu Play',
    short_name: 'Exu Play',
    description: "L'art de la pensée, réinventé. Plateforme d'éveil philosophique et de défis mentaux.",
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Défis Mentaux',
        url: '/home',
        description: 'Accéder directement aux quiz',
        icons: [{ src: '/manifest/play.svg', sizes: '192x192', type: 'image/svg+xml' }]
      },
      {
        name: 'Mon Profil',
        url: '/profil',
        description: 'Voir ma progression',
        icons: [{ src: '/manifest/profile.svg', sizes: '192x192', type: 'image/svg+xml' }]
      },
      {
        name: 'Paramètres',
        url: '/parametres',
        description: 'Ajuster mes réglages',
        icons: [{ src: '/manifest/settings.svg', sizes: '192x192', type: 'image/svg+xml' }]
      }
    ]
  };
}
