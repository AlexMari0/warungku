// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vite-pwa/nuxt'
  ],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'WarungKu POS',
      short_name: 'WarungKu',
      theme_color: '#10b981',
      background_color: '#18181b',
      display: 'standalone',
      icons: [
        {
          src: '/pwa-192x192.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        },
        {
          src: '/pwa-512x512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/.*\/(products|categories).*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    }
  },

  devtools: {
    enabled: true
  },

  imports: {
    dirs: [
      'core/composables/**',
      'features/**/composables/**',
    ]
  },

  components: [
    {
      path: '~/components/ui',
      pathPrefix: false
    },
    {
      path: '~/features',
      pattern: '**/components/**',
      pathPrefix: false
    }
  ],

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'page', mode: 'out-in' },
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
      supabase: {
        url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY
      }
    }
  },

  routeRules: {
    '/': { prerender: true }
  },
  future: {
    compatibilityVersion: 4
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirect: false,
    types: '~/core/types/database.types.ts'
  },
})
