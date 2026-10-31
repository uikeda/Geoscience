/* Offline support. The page is fetched network-first so a new build shows up on the next visit without bumping
   any version here; the cached copy is only used when the network is down or too slow. */
const CACHE = "chigaku-app";
const FONTS = "chigaku-fonts";
const INDEX = new URL("./", self.registration.scope).href;
const CORE = ["./", "manifest.json", "icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") e.respondWith(page(req, url));
  else if (url.origin === location.origin) e.respondWith(staleWhileRevalidate(req, CACHE));
  else if (url.hostname === "fonts.googleapis.com") e.respondWith(staleWhileRevalidate(req, FONTS));
  else if (url.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(req, FONTS));
});

// Every page under the scope is the one app page, so it is cached under a single key.
async function page(req, url) {
  const cache = await caches.open(CACHE);
  const isApp = url.href.split(/[?#]/)[0] === INDEX || url.pathname.endsWith("/index.html");
  const net = fetch(req).then(res => {
    if (res.ok && isApp) cache.put(INDEX, res.clone());
    return res;
  });
  net.catch(() => {});
  const slow = new Promise(r => setTimeout(r, 3500));
  try {
    const res = await Promise.race([net, slow]);
    if (res) return res;
  } catch (err) { /* offline: fall through to the cache */ }
  const hit = await cache.match(INDEX);
  return hit || net;
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
  if (hit) { net.catch(() => {}); return hit; }
  return net;
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}
