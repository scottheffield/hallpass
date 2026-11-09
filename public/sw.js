const RUNTIME_CACHE = "hallpass-runtime-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(RUNTIME_CACHE));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key))),
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

function cacheFirstRuntime(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  });
}

function isHtmlNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  );
}

function isStaticDataOrFloor(pathname) {
  return (
    pathname === "/agenda.json" ||
    pathname === "/rooms.json" ||
    pathname.startsWith("/floor/")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstRuntime(event.request));
    return;
  }

  if (
    isHtmlNavigation(event.request) ||
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    isStaticDataOrFloor(url.pathname)
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
