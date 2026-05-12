import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Dev proxy target: backend origin only (no /api). Railway/Vercel use production build + VITE_API_URL instead. */
function devProxyTarget() {
  const direct = (process.env.VITE_DEV_PROXY_TARGET || '').trim().replace(/\/$/, '').replace(/\/api\/?$/i, '');
  if (direct) return direct;
  const fromApi = (process.env.VITE_API_URL || '').trim().replace(/\/$/, '').replace(/\/api\/?$/i, '');
  if (fromApi) return fromApi;
  return 'http://127.0.0.1:5000';
}

const apiProxyTarget = devProxyTarget();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    hmr: {
      clientPort: 3001,
    },
    fs: {
      // Allow serving files from node_modules
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        },
      },
      '/static': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    // Avoid esbuild CSS minify "Unexpected }" false positive on valid CSS
    cssMinify: false,
    // Disable sourcemaps in production for smaller bundle size (3G-4G optimization)
    sourcemap: process.env.NODE_ENV === 'development',
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // Single vendor chunk is ~2.2 MB; raise limit so we don't warn (splitting caused circular deps)
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        // Single vendor chunk avoids circular chunk dependency warnings
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
        // Optimize chunk file names for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB (base64)
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@fortawesome/fontawesome-free'], // Exclude large icon library from pre-bundling
  },
});

