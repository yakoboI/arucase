import { installBenignConsoleFilters } from './utils/benignConsole';
installBenignConsoleFilters();

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';
// adminTheme.css loads with AdminLayout (admin routes only)
// Font Awesome loads after first paint (see loadIconFonts below)
// Initialize utilities
import './utils/debugAuth.js'; // Import debug utility to make it available globally
import './utils/logHelper'; // Initialize log helper (makes window.logHelper available)
import './utils/tokenDecoder'; // Initialize token decoder (makes window.logTokenInfo available)
import { registerServiceWorker } from './utils/registerServiceWorker';
import { isBenignUnhandledRejection } from './utils/benignRejections';
import {
  isHomeRoute,
  prefetchHomepageData,
  prefetchHomePageChunks,
} from './utils/homepagePrefetch';

const CHUNK_RELOAD_KEY = 'arucase-chunk-reload';

/** After a new deploy, cached index.html may reference removed hashed chunks (404 → MIME errors). */
function isStaleChunkLoadFailure(reason) {
  const msg = String(reason?.message ?? reason ?? '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to load module script') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('dynamically imported module')
  ) {
    return true;
  }
  if (reason?.name === 'ChunkLoadError') return true;
  return false;
}

function reloadOnceForStaleChunks() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return false;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
  return true;
}

// Detect network speed for adaptive loading (3G-4G optimization)
const getNetworkSpeed = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      // effectiveType: '2g', '3g', '4g', 'slow-2g'
      const effectiveType = connection.effectiveType || '4g';
      const downlink = connection.downlink || 10; // Mbps
      
      // Consider slow if effectiveType is 2g/3g or downlink < 1.5 Mbps
      return {
        isSlow: effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g' || downlink < 1.5,
        effectiveType,
        downlink,
      };
    }
  }
  // Default to assuming slower network for Tanzanian users
  return { isSlow: true, effectiveType: '3g', downlink: 1 };
};

const networkInfo = getNetworkSpeed();

// Create a client for React Query optimized for 3G-4G networks
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Longer cache times for slower networks to reduce data usage
      staleTime: networkInfo.isSlow ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 min on slow, 5 min on fast
      cacheTime: networkInfo.isSlow ? 30 * 60 * 1000 : 10 * 60 * 1000, // 30 min on slow, 10 min on fast
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Longer retry delays for slow networks
      retryDelay: networkInfo.isSlow ? 3000 : 1000, // 3s on slow, 1s on fast
      retry: (failureCount, error) => {
        // Don't retry on 401 (authentication) or 404 (not found) errors
        if (error?.response?.status === 401 || error?.response?.status === 404) {
          return false;
        }
        // Fewer retries on slow networks to save data
        const maxRetries = networkInfo.isSlow ? 1 : 2;
        return failureCount < maxRetries;
      },
      onError: (error) => {
        // Log error but don't show toast for 404 errors (expected for missing data)
        if (error?.response?.status !== 404) {
          console.error('Query error:', error);
        }
        // Prevent unhandled promise rejection
        return Promise.resolve();
      },
    },
    mutations: {
      // Longer retry delays for mutations on slow networks
      retryDelay: networkInfo.isSlow ? 2000 : 1000,
      retry: networkInfo.isSlow ? 1 : 2,
      onError: (error) => {
        console.error('Mutation error:', error);
        // Prevent unhandled promise rejection
        return Promise.resolve();
      },
    },
  },
});

// Capture phase — suppress extension/Vercel toolbar rejections before Chrome logs them
window.addEventListener('unhandledrejection', (event) => {
  if (event.defaultPrevented) return;
  if (isStaleChunkLoadFailure(event.reason)) {
    event.preventDefault();
    reloadOnceForStaleChunks();
    return;
  }

  if (isBenignUnhandledRejection(event.reason)) {
    event.preventDefault();
    return;
  }

  if (import.meta.env.DEV) {
    console.warn('Unhandled promise rejection:', event.reason);
  }
  event.preventDefault();
}, true);

// Failed lazy route scripts (e.g. old AdminLayout-*.js after deploy)
window.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLScriptElement) && !(target instanceof HTMLLinkElement)) return;
    const url = target.src || target.href || '';
    if (!url.includes('/js/') && !url.includes('/assets/')) return;
    if (reloadOnceForStaleChunks()) {
      event.preventDefault();
    }
  },
  true
);

// Global image error handler to suppress 404 errors for missing images
window.addEventListener('error', (event) => {
  // Suppress 404 errors for images (missing files are expected)
  if (
    event.target instanceof HTMLImageElement &&
    event.type === 'error' &&
    (event.target.src?.includes('/static/uploads/photos/') ||
     event.target.src?.includes('/static/uploads/'))
  ) {
    // Silently handle missing images - they're already handled by onError handlers
    event.preventDefault();
    return false;
  }
}, true); // Use capture phase to catch errors early

// Initialize performance optimizations
import { initPerformanceOptimizations } from './utils/performanceUtils';
initPerformanceOptimizations();

function loadIconFonts() {
  import('@fortawesome/fontawesome-free/css/fontawesome.css').catch(() => {});
  import('@fortawesome/fontawesome-free/css/solid.css').catch(() => {});
  import('@fortawesome/fontawesome-free/css/regular.css').catch(() => {});
  import('@fortawesome/fontawesome-free/css/brands.css').catch(() => {});
}

// Defer non-critical route chunks (skip on homepage — prefetch hurt mobile LCP)
function deferNonCriticalAssets() {
  const path = window.location.pathname;
  const isAuthScreen = path === '/login' || path === '/student-login';
  if (path !== '/' && path !== '' && !isAuthScreen) {
    import('./pages/auth/Login').catch(() => {});
    import('./pages/public/StudentLogin').catch(() => {});
    import('./pages/public/Gallery').catch(() => {});
  }
  loadIconFonts();
}

if (typeof window !== 'undefined') {
  const runDefer = () => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(deferNonCriticalAssets, { timeout: 8000 });
    } else {
      setTimeout(deferNonCriticalAssets, 4000);
    }
  };
  if (document.readyState === 'complete') {
    runDefer();
  } else {
    window.addEventListener('load', runDefer, { once: true });
  }
}

registerServiceWorker();

// App booted — allow one auto-reload again after the next deployment
sessionStorage.removeItem(CHUNK_RELOAD_KEY);

if (typeof window !== 'undefined' && isHomeRoute()) {
  prefetchHomePageChunks();
  prefetchHomepageData(queryClient).catch(() => {});
} else if (typeof window !== 'undefined') {
  // Non-home public/admin routes: load icons soon after first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(loadIconFonts);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

