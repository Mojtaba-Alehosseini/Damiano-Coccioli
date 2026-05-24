/* Service worker — Damiano Coccioli campaign site
 * Strategy: cache-first for the come-votare page (critical at polling stations
 * where signal can be weak), network-first for everything else.
 */

const CACHE_VERSION = 'dc-v2-2026-05-22-analytics';
const PRECACHE = [
  './',
  'come-votare/',
  'manifest.webmanifest',
  '404.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Cache-first for the come-votare page (critical offline page)
  if (url.pathname === 'come-votare/' || url.pathname === '/come-votare/index.html') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match('come-votare/')))
    );
    return;
  }

  // Network-first with cache fallback for everything else
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match('404.html')))
  );
});
