import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Configuration Vite pour TAOFIC AJAGBE CRM
 * - React avec SWC pour compilation rapide
 * - Tailwind CSS v4 intégré
 * - PWA avec Service Worker automatique
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Auto-update du SW quand une nouvelle version est disponible
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Activer le PWA en dev pour tester facilement
      devOptions: {
        enabled: true,
        type: 'module'
      },

      // Configuration du Service Worker (Workbox)
      workbox: {
        // Fichiers à mettre en cache automatiquement
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?!__).*/],

        // Nettoyer les anciens caches à chaque déploiement
        cleanupOutdatedCaches: true,

        // Stratégies de cache pour les ressources externes
        runtimeCaching: [
          // Google Fonts - feuilles de style CSS
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst', // Cache d'abord car change rarement
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts - fichiers de police
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Firebase Realtime Database
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkFirst', // Réseau en premier pour données fraîches
            options: {
              cacheName: 'firebase-data',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
              }
            }
          },
          // Firebase App (Auth, Firestore)
          {
            urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-app',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
              }
            }
          }
        ]
      },
      // Assets à inclure dans le cache
      includeAssets: ['*.ico', '*.svg', '*.png', '*.jpg', 'bg-*.png'],

      // Manifest PWA - métadonnées de l'application
      manifest: {
        name: 'TAOFIC AJAGBE CRM',
        short_name: 'TAOFIC CRM',
        description: 'Application CRM pour la gestion des clients et transactions de TAOFIC AJAGBE',
        theme_color: '#3b82f6', // Couleur de la barre d'adresse mobile
        background_color: '#ffffff',
        display: 'standalone', // Affichage en plein écran (comme une app native)
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        categories: ['business', 'productivity', 'utilities'],

        // Icônes de l'app (utilisées sur l'écran d'accueil)
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any' // Icône standard
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable' // Icône adaptive (s'adapte aux formes d'icônes Android)
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
