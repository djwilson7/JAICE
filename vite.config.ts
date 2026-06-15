/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite' // Tailwind CSS plugin for Vite

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('/chart.js/') ||
            id.includes('/chartjs-chart-matrix/') ||
            id.includes('/react-chartjs-2/')
          ) {
            return 'charts'
          }
          if (id.includes('/firebase/') || id.includes('/@supabase/')) {
            return 'data'
          }
          if (id.includes('/react-markdown/') || id.includes('/remark-gfm/')) {
            return 'markdown'
          }
          if (id.includes('/framer-motion/') || id.includes('/lottie-react/')) {
            return 'motion'
          }
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./client/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['client/**/*.{ts,tsx}'],
      exclude: ['client/**/*.test.{ts,tsx}', 'client/setupTests.ts']
    }
  }
});
