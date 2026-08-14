const CACHE_NAME = "listenit-v7";
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
  "/thumbnails/corporatesucks.jpg",
  "/thumbnails/nostalgia-cassette.jpg",
  "/thumbnails/deluxesalon.jpg",
  "/thumbnails/chai-tapri.jpg",
  "/thumbnails/pan-wala.jpg",
  "/thumbnails/thenisai-saloon.jpg",
  "/thumbnails/busdriver.jpg",
  "/thumbnails/rickshaw-wala.jpg",
  "/thumbnails/rickshaw-radio.jpg",
  "/thumbnails/truckplaylist.jpg",
  "/thumbnails/safar.jpg",
  "/thumbnails/mehfil.jpg",
  "/thumbnails/kudimagan.jpg",
  "/thumbnails/garba-navratri.jpg",
  "/thumbnails/rajasthani-folk.jpg",
  "/thumbnails/bangla-bangers.jpg",
  "/thumbnails/places-have-sound.jpg",
  "/thumbnails/kassita.jpg",
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
