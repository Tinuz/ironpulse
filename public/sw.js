// NXT•REP Service Worker
// Strategy:
//   - Static assets (JS, CSS, images, fonts): cache-first
//   - API routes (/api/*): network-first, no caching
//   - HTML navigation: network-first with offline fallback

const CACHE_NAME = 'nxtrep-v1';
const OFFLINE_PAGE = '/offline.html';

const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

function isApiRequest(url) {
  return new URL(url).pathname.startsWith('/api/');
}

// Install: pre-cache the offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // API: network-only (never serve stale AI/auth responses)
  if (isApiRequest(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation (HTML): network-first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_PAGE).then((fallback) => fallback || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }
});
