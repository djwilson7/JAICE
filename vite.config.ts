/// <reference types="vitest" />
import { defineConfig } from 'vite'
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
