import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Injected into index.html at build/dev time when env vars are set (Search Console, Webmaster tools). */
function buildVerificationMetaTags() {
  const tags = [];
  const google = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
  if (google) {
    tags.push(`<meta name="google-site-verification" content="${escapeHtmlAttr(google)}" />`);
  }
  const bing = process.env.VITE_BING_MS_VALIDATE?.trim();
  if (bing) {
    tags.push(`<meta name="msvalidate.01" content="${escapeHtmlAttr(bing)}" />`);
  }
  const yandex = process.env.VITE_YANDEX_VERIFICATION?.trim();
  if (yandex) {
    tags.push(`<meta name="yandex-verification" content="${escapeHtmlAttr(yandex)}" />`);
  }
  const pinterest = process.env.VITE_PINTEREST_DOMAIN_VERIFY?.trim();
  if (pinterest) {
    tags.push(`<meta name="p:domain_verify" content="${escapeHtmlAttr(pinterest)}" />`);
  }
  const facebook = process.env.VITE_FACEBOOK_DOMAIN_VERIFICATION?.trim();
  if (facebook) {
    tags.push(`<meta name="facebook-domain-verification" content="${escapeHtmlAttr(facebook)}" />`);
  }
  return tags.length ? `    ${tags.join('\n    ')}` : '';
}

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
  plugins: [
    react(),
    {
      name: 'seo-site-verification-and-bing-xml',
      transformIndexHtml(html) {
        const block = buildVerificationMetaTags();
        return html.replace('<!-- SEO_SITE_VERIFICATION_TAGS -->', block);
      },
      closeBundle() {
        const bingUser = process.env.VITE_BING_WEBMASTER_USER_ID?.trim();
        if (!bingUser) return;
        const distDir = path.resolve(__dirname, 'dist');
        const outFile = path.join(distDir, 'BingSiteAuth.xml');
        if (!fs.existsSync(distDir)) return;
        const escaped = bingUser
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        const xml = `<?xml version="1.0"?>
<users>
  <user>${escaped}</user>
</users>
`;
        fs.writeFileSync(outFile, xml, 'utf8');
      },
    },
  ],
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

