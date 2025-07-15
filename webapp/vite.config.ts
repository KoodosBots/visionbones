import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tanstack/react-query',
      '@tanstack/react-query-devtools',
      'react',
      'react-dom',
      '@supabase/supabase-js'
    ]
  },
  build: {
    rollupOptions: {
      onwarn: (warning, warn) => {
        // Suppress certain warnings that can cause build failures
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
