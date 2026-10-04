/* Service worker: makes the app installable and usable offline.
 * It caches ONLY the app's own static files. Requests to Supabase (auth, database) are never cached:
 * user data is kept by the app's own per-user cache and synced when online. */
const VERSION = '__BUILD_VERSION__';
const CACHE = 'lingua-shell-' + VERSION;
const PRECACHE = __PRECACHE_LIST__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('lingua-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase & other origins: straight to network
  if (req.mode === 'navigate') {
    // network first so a new deploy is picked up; offline → cached app shell
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
