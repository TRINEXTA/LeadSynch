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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/__tests__/**', 'src/main.jsx']
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
    sourcemap: process.env.NODE_ENV === 'development', // Désactivé en production pour sécurité
    minify: 'esbuild', // Plus stable que terser pour les dépendances React

    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ✅ FIX: Regrouper React avec TOUTES les dépendances qui l'utilisent
        manualChunks: {
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-hot-toast',
            'framer-motion',  // Utilise useSyncExternalStore
            '@hello-pangea/dnd'
          ],
          'vendor-charts': ['recharts'],
          'vendor-http': ['axios'],
          'vendor-icons': ['lucide-react']
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
    target: 'esnext',
    // Optimisation assets
    assetsInlineLimit: 4096 // Inline assets < 4KB en base64
  },
  // Optimisations générales
  esbuild: {
    // Supprime les commentaires
    legalComments: 'none',
    // Optimise le tree-shaking
    treeShaking: true,
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})