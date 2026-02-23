import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true
      },
      '/uploads': {
        target: apiUrl,
        changeOrigin: true
      }
    }
  },
  build: {
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true
      },
      '/uploads': {
        target: apiUrl,
        changeOrigin: true
      }
    }
  }
})
