// Service Worker for Arusha Catholic Seminary
// Only caches same-origin assets — never intercepts third-party or extension requests.

const CACHE_NAME = 'arucase-v3';
const STATIC_CACHE_NAME = 'arucase-static-v3';
const IMAGE_CACHE_NAME = 'arucase-images-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

function offlineJsonResponse() {
  return new Response(
    JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function offlineHtmlResponse() {
  return caches.match('/index.html').then(
    (cached) =>
      cached ||
      new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      })
  );
}

function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response.ok && cacheName) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || offlineJsonResponse())
    );
}

function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(
        () =>
          new Response('', {
            status: 504,
            statusText: 'Gateway Timeout',
          })
      );
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name !== CACHE_NAME &&
                name !== STATIC_CACHE_NAME &&
                name !== IMAGE_CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!url.protocol.startsWith('http')) return;

  // Never intercept cross-origin (extensions, Google Fonts, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // API — network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Hashed build assets + local fonts
  if (url.pathname.match(/^\/(js|assets|fonts|icons|sounds)\//)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Uploaded / backend static images on same host
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
    url.pathname.startsWith('/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          fetch(request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(
            () =>
              new Response('', {
                status: 504,
                statusText: 'Gateway Timeout',
              })
          );
      })
    );
    return;
  }

  // SPA navigation
  const accept = request.headers.get('accept') || '';
  if (request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => offlineHtmlResponse())
    );
    return;
  }

  // Other same-origin GET: browser default (no respondWith)
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
    );
  }
});
