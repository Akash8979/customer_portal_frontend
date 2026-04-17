import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/portal/ai-engine': {
        target: 'http://localhost:9080',
        changeOrigin: true,
      },
      '/portal': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
})
