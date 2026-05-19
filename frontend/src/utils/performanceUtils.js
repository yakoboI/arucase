/**
 * Performance Utilities for Faster Loading
 * Optimizations for 3G-4G networks in Tanzania
 */

/**
 * Preload critical resources - only resources used in first paint.
 * (Avoid preloading images that aren't used immediately to prevent
 * "preloaded but not used" console warnings.)
 */
export const preloadCriticalResources = () => {
  // Skip image preloads - they trigger "preloaded but not used" warnings
  // Icons are loaded by manifest/app when needed
};

/**
 * Defer non-critical resources
 */
export const deferNonCriticalResources = () => {
  // Defer loading of non-critical CSS/JS
  const nonCritical = document.querySelectorAll('[data-defer]');
  nonCritical.forEach((el) => {
    if (el.tagName === 'SCRIPT') {
      el.defer = true;
    }
  });
};

/**
 * Lazy-load images marked for deferred loading (avoids forced layout reads).
 */
export const optimizeImages = () => {
  const images = document.querySelectorAll('img[data-lazy-below-fold]:not([loading])');
  images.forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });
};

/**
 * Show content faster by reducing initial render blocking
 */
export const optimizeInitialRender = () => {
  // Mark non-critical content
  const nonCritical = document.querySelectorAll('[data-non-critical]');
  requestIdleCallback(() => {
    nonCritical.forEach((el) => {
      el.style.display = '';
    });
  });
};

/**
 * Use requestIdleCallback with fallback
 */
export const requestIdleCallback = (callback) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    return setTimeout(callback, 1);
  }
};

/**
 * Optimize font loading
 */
export const optimizeFontLoading = () => {
  // Use font-display: swap for better perceived performance
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'FontAwesome';
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initialize performance optimizations
 */
export const initPerformanceOptimizations = () => {
  const runDeferredLayoutWork = () => {
    optimizeImages();
    optimizeFontLoading();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      requestIdleCallback(runDeferredLayoutWork);
    });
  } else {
    requestIdleCallback(runDeferredLayoutWork);
  }

  // Defer non-critical resources after initial load
  window.addEventListener('load', () => {
    deferNonCriticalResources();
    optimizeInitialRender();
  });
};
