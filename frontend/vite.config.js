import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name:             'BlockQuest — 테트리스 배틀 TRPG',
        short_name:       'BlockQuest',
        description:      'AI 게임 마스터와 함께하는 테트리스 배틀 TRPG',
        theme_color:      '#07071a',
        background_color: '#07071a',
        display:          'standalone',
        orientation:      'portrait-primary',
        scope:            '/',
        start_url:        '/',
        lang:             'ko',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['games', 'entertainment'],
        shortcuts: [
          { name: '게임 시작', url: '/story-select', icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }] },
          { name: '챌린지',   url: '/challenge',    icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }] },
          { name: '전적',     url: '/history',      icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        runtimeCaching: [
          // 구글 폰트 — CacheFirst
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // 인증/API — 항상 네트워크
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
          // 정적 에셋 — StaleWhileRevalidate
          {
            urlPattern: /\.(js|css|woff2|png|svg|ico)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        // 오프라인 폴백
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // 서비스 워커 캐시 사전 등록 크기 제한
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,  // 3MB
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    // 청크 분리 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          phaser:  ['phaser'],
          vendor:  ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
