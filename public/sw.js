/*
 * Alvastudio's service worker: makes the app installable and lets it open
 * without a connection. It never touches the API (another origin) or any
 * request but a GET, so nothing about money or uploads is ever served stale.
 *
 * - Pages: network first; the last good page is the offline fallback.
 * - Hashed build files (/assets/name-HASH.ext): cache first. A new deploy
 *   has new names, so these can never be stale.
 * - Pushes (ask #19): shown as they come; a tap opens their `url` here.
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

/* A studio path, never somewhere else: anything off this origin opens "/". */
const studioUrl = (url) => {
  try {
    const target = new URL(url || "/", self.location.origin);
    return target.origin === self.location.origin ? target.href : self.location.origin + "/";
  } catch {
    return self.location.origin + "/";
  }
};

/* `{title, body, url, key}`. Always shown: a push must end in a notification. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* Shown with the defaults below. */
  }
  const options = { body: data.body || "", data: { url: data.url, key: data.key }, icon: "/icons/icon-192.png" };
  if (data.key) options.tag = data.key;
  event.waitUntil(self.registration.showNotification(data.title || "Alvastudio", options));
});

/* Brings an open studio window to the front and takes it to `url`, or opens one. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = studioUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      /* Clients are this origin's only; the focused one first. */
      const open = windows.find((client) => client.focused) || windows[0];
      if (!open) return self.clients.openWindow(url);
      return open
        .focus()
        .then((client) => {
          const focused = client || open;
          return focused.url === url ? focused : focused.navigate(url);
        })
        .catch(() => self.clients.openWindow(url));
    })
  );
});
