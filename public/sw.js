const SHELL_CACHE = "hallpass-shell-v1";
const RUNTIME_CACHE = "hallpass-runtime-v1";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/agenda.json",
  "/rooms.json",
  "/floor/salt-palace-flat-map.pdf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/agenda.json" ||
    url.pathname === "/rooms.json" ||
    url.pathname.startsWith("/floor/")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? networkFirst(event.request)),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
