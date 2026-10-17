// Offline support: the game shell and three.js are cached on install. Pages load
// network-first so a new version on GitHub Pages reaches players the next time they are online.
// three.js is self-hosted (vendor/) so there is no third-party CDN in the runtime.
const CACHE = 'arena-ocaso-v3';
const CORE = [
  './',
  './index.html',
  './game.js',
  './manifest.webmanifest',
  './vendor/three-r128.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Google Fonts only: cache-first, filled on first online visit. Any other
  // cross-origin request is passed straight through and never cached, so a
  // response from an unexpected host can't be stored and replayed later.
  const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  if (!FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
