import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
      },
      devOptions: {
        // permite testar o SW em `npm run dev` (fica registrado mesmo fora de build/preview)
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
