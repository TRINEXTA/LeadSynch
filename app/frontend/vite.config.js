import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimisation minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprime console.log en production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Optimisation chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Chunking stratégique pour meilleur cache
        manualChunks: (id) => {
          // Vendor chunks (libraries tierces)
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('framer-motion') || id.includes('@hello-pangea')) {
              return 'vendor-ui';
            }
            // Charts
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // HTTP client
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            // Toast notifications
            if (id.includes('react-hot-toast')) {
              return 'vendor-toast';
            }
            // Autres vendors
            return 'vendor-other';
          }

          // Pages chunks (lazy loaded automatiquement grâce à React.lazy)
          // Les pages seront automatiquement splittées par route
        },
        // Noms de fichiers avec hash pour cache-busting
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Optimisation CSS
    cssCodeSplit: true,
    // Target moderne pour bundle plus petit
    target: 'es2015',
    // Optimisation assets
    assetsInlineLimit: 4096 // Inline assets < 4KB en base64
  },
  // Optimisations générales
  esbuild: {
    // Supprime les commentaires
    legalComments: 'none',
    // Optimise le tree-shaking
    treeShaking: true
  }
})