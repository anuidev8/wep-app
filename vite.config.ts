import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './', // Required for Capacitor: assets must load correctly from file:// on Android
      server: {
        port: 3000,
        host: '0.0.0.0', // Required for Capacitor live reload: simulator/device must reach dev server via LAN IP
        proxy: {
          // Proxy systeme.io API requests to avoid CORS issues in web development
          '/api/systeme': {
            target: 'https://api.systeme.io',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/systeme/, '/api'),
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('Proxy error:', err);
              });
            },
          },
        },
      },
      plugins: [
        react(),
        mode === 'analyze'
          ? visualizer({
              filename: 'dist/stats.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: true,
            })
          : undefined,
      ].filter(Boolean),
      build: {
        reportCompressedSize: false,
        minify: 'esbuild',
        sourcemap: false,
        chunkSizeWarningLimit: 800,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'ui-vendor': ['framer-motion', 'lucide-react'],
              'capacitor-vendor': ['@capacitor/core', '@capacitor/app'],
            },
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.FREE_ASTRO_API_KEY': JSON.stringify(env.FREE_ASTRO_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
