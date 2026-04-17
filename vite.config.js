import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/portal/ai-engine': {
        target: 'https://customerportalaiengine-production.up.railway.app',
        changeOrigin: true,
      },
      '/portal': {
        target: 'https://customerportal-production-aa42.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
