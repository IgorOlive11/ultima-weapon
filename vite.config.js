import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // alias @ -> src (esperado por componentes Originkit; ver src/components/originkit)
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  // multi-page: app principal (index.html) + landing de teste (landing.html)
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // registro manual em main.jsx (virtual:pwa-register) em vez do script auto-injetado
      injectRegister: null,
      // manifest já existe em public/manifest.json e é referenciado em index.html —
      // não deixa o plugin gerar/injetar um segundo
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,gif,svg,woff2,ico}'],
        // handlers de push/notificationclick, fora do que o workbox gera sozinho
        importScripts: ['sw-push.js'],
      },
      devOptions: {
        // permite testar o SW em `npm run dev` (fica registrado mesmo fora de build/preview)
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
