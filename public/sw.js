/*
 * Alvastudio's service worker: makes the app installable and lets it open
 * without a connection. It never touches the API (another origin) or any
 * request but a GET, so nothing about money or uploads is ever served stale.
 *
 * - Pages: network first; the last good page is the offline fallback.
 * - Hashed build files (/assets/name-HASH.ext): cache first. A new deploy
 *   has new names, so these can never be stale.
 */
const CACHE = "alva-shell-v1";
const HASHED = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|svg|webp)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const keep = (key, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(key, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    /* Every route is the same page, so one copy under "/" covers them all. */
    event.respondWith(
      fetch(request)
        .then((response) => keep("/", response))
        .catch(() => caches.match("/").then((hit) => hit || Response.error()))
    );
    return;
  }

  if (HASHED.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => keep(request, response)))
    );
  }
});
