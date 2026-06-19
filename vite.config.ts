/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite' // Tailwind CSS plugin for Vite

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'resume-formatting-css-tokens',
      enforce: 'pre',
      resolveId(source) {
        if (source === 'virtual:resume-formatting-tokens') return '\0resume-formatting-tokens'
        return null
      },
      load(id) {
        if (id !== '\0resume-formatting-tokens') return null
        const cssPath = path.resolve(__dirname, 'common/resume_render/formatting.css')
        this.addWatchFile(cssPath)
        const css = fs.readFileSync(cssPath, 'utf8')
        return `export default ${JSON.stringify(css)}`
      },
    },
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
      exclude: [
        'client/**/*.test.{ts,tsx}',
        'client/setupTests.ts',
        'client/**/*.d.ts',
        'client/types/dragTarget.ts',
        'client/types/jobApplicationRow.ts',
        'client/types/jobBroadcastPayload.ts',
        'client/types/jobCardType.ts',
        'client/types/jobIntent.ts',
        'client/types/undoAction.ts',
        'client/pages/settings/provider/settingsTypes.ts',
        'client/pages/Resume/types.ts',
      ]
    }
  }
});
