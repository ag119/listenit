const CACHE_NAME = "listenit-v17";
const APP_SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/apps-data.js",
  "/js/firebase-config.js",
  "/js/firebase-app.mjs",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/og-cover.jpg",
  // Individual per-app thumbnails aren't pre-cached here on purpose — with
  // 40+ apps and growing, hardcoding every filename doesn't scale and is
  // easy to forget on the next addition. They still end up cached for
  // offline use via the general fetch handler below (network-first, cached
  // as a side effect) the first time each one is actually viewed; only the
  // universal fallback needs to be guaranteed available up front.
  "/thumbnails/placeholder.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests — never intercept the third-party
  // apps loaded inside the viewer iframe, they manage their own caching.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Network-first, cache as an offline fallback only. A cache-first strategy
  // here would mean edits to app.js/style.css/status.json go unnoticed by
  // anyone with the PWA already installed until the SW's own script changes
  // (a CACHE_NAME bump) — that's surprising for a site whose data (which
  // apps are listed, which are down) is expected to change over time.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
