// Minimal service worker for Rain-N-Route.
// - Static assets (Next.js _next, fonts, icons): cache-first.
// - Navigations (HTML): network-first with offline fallback.
// - API requests: network-only (we never want to serve stale weather/route data).

const CACHE_NAME = 'cw-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = ['/', '/explore', OFFLINE_URL, '/icon-192.png', '/icon-512.png', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: never cache.
  if (url.pathname.startsWith('/api/')) return;

  // Static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Explore: network-first with cache fallback for offline revisit.
  if (req.mode === 'navigate' && url.pathname === '/explore') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(OFFLINE_URL).then((r) => r || Response.error())),
        ),
    );
    return;
  }

  // Navigation: network-first, fallback to offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
    );
  }
});
