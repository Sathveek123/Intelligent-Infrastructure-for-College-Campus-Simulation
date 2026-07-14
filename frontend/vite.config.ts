import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Leaflet map — largest chunk, split first
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'vendor-map'
          }
          // Recharts charting library
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts'
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
          // React core
          if (id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react'
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor-utils'
          }
        },
      },
    },
    // Strip console and debugger in production
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})

