// Keep fetch routing in sync with src/lib/swRouting.ts
const RUNTIME_CACHE = "hallpass-runtime-v3";

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

function networkFirst(request, { freshShell = false } = {}) {
  const fetchRequest = freshShell ? new Request(request, { cache: "no-store" }) : request;
  return fetch(fetchRequest)
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

function isShellNavigation(request, pathname) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    pathname === "/" ||
    pathname === "/index.html" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  );
}

function isOfflineStaticPath(pathname) {
  return (
    pathname === "/agenda.json" ||
    pathname === "/rooms.json" ||
    pathname.startsWith("/floor/")
  );
}

function resolveSwFetchStrategy(request, pathname, sameOrigin) {
  if (request.method !== "GET") return null;
  if (!sameOrigin) return null;
  if (pathname.startsWith("/api/")) return "network-first";
  if (pathname.startsWith("/assets/")) return "cache-first";
  if (isShellNavigation(request, pathname)) return "network-first";
  if (isOfflineStaticPath(pathname)) return "network-first";
  return "network-fallback";
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const strategy = resolveSwFetchStrategy(event.request, url.pathname, url.origin === self.location.origin);
  if (!strategy) return;

  if (strategy === "network-first") {
    const freshShell = isShellNavigation(event.request, url.pathname);
    event.respondWith(networkFirst(event.request, { freshShell }));
    return;
  }

  if (strategy === "cache-first") {
    event.respondWith(cacheFirstRuntime(event.request));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
