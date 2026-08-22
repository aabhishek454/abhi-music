/* ABHI MUSIC — Service Worker (offline shell) */
const CACHE = 'abhi-music-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/css/tokens.css', '/css/layout.css', '/css/player.css',
  '/js/icons.js', '/js/data.js', '/js/player.js', '/js/views.js', '/js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // network-first for artwork, cache-first for app shell
  if (url.hostname.includes('picsum.photos') || url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => hit))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});