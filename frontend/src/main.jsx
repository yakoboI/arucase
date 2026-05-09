import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';
// Initialize utilities
import './utils/debugAuth.js'; // Import debug utility to make it available globally
import './utils/logHelper'; // Initialize log helper (makes window.logHelper available)
import './utils/tokenDecoder'; // Initialize token decoder (makes window.logTokenInfo available)

// Global error handling for uncaught promises (silent)
window.addEventListener('unhandledrejection', (event) => {
  // Prevent the default browser behavior
  event.preventDefault();
});

// Global error handling for uncaught errors (silent)
window.addEventListener('error', (event) => {
  // Silent error handling
});

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

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const url = reason?.config?.url || reason?.message || '';
  const reqInfo = reason?.reqInfo;
  
  // Log for debugging
  if (import.meta.env.DEV && reason?.code === 403) {
    console.log('🔍 403 error details:', {
      code: reason?.code,
      httpStatus: reason?.httpStatus,
      httpError: reason?.httpError,
      name: reason?.name,
      fullReason: reason
    });
  }
  
  // Suppress known benign cases
  if (url.includes('ERR_BLOCKED_BY_CLIENT') || reason?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    event.preventDefault();
    return;
  }
  
  // Suppress ALL 403 errors regardless of httpStatus - they're permission checks
  if (reason?.code === 403 || String(reason?.code) === '403') {
    event.preventDefault();
    return;
  }
  
  // Suppress browser extension errors (Grammarly, etc.)
  // Suppress 403-in-body responses (HTTP 200 with {code: 403}) - auth/permission checks, UserAuthError, etc.
  if (
    reqInfo?.pathPrefix === '/writing' ||
    reqInfo?.path?.includes('/writing') ||
    (reason?.code === 403 && reason?.data?.code === 403 && reason?.data?.error === 'exceptions.UserAuthError') ||
    (reason?.code === 403 && (reason?.httpStatus === 200 || reason?.httpError === false)) ||
    (reason?.code === 403 && reason?.httpStatus === 200) ||
    (String(reason?.code) === '403' && String(reason?.httpStatus) === '200')
  ) {
    event.preventDefault();
    return;
  }
  
  // Don't log 401 (expected when not logged in or token expired)
  if (reason?.response?.status === 401) {
    event.preventDefault();
    return;
  }
  
  // Suppress chunk loading errors (lazy loading failures) - they're handled by ErrorBoundary
  if (reason?.message?.includes('Loading chunk') || reason?.message?.includes('chunk')) {
    event.preventDefault();
    return;
  }
  
  // Suppress generic object errors without stack (likely chunk loading)
  if (reason && typeof reason === 'object' && !reason.stack && !reason.message) {
    event.preventDefault();
    return;
  }
  
  if (import.meta.env.DEV) {
    console.warn('Unhandled promise rejection:', reason);
  }
  event.preventDefault();
});

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

// Prefetch login and high-traffic route chunks on idle to improve LCP (e.g. logout→login, nav to student portal/gallery)
function prefetchLCPRoutes() {
  const prefetch = () => {
    import('./pages/auth/Login');           // /login – after logout
    import('./pages/public/StudentLogin'); // /student-login
    import('./pages/public/Gallery');      // /gallery
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(prefetch, { timeout: 2000 });
  } else {
    setTimeout(prefetch, 1500);
  }
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    prefetchLCPRoutes();
  } else {
    window.addEventListener('load', prefetchLCPRoutes);
  }
}

// Register Service Worker for offline support (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.warn('[SW] Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

