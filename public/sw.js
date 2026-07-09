// Minimal service worker — exists mainly to satisfy PWA installability criteria.
// Deliberately does NOT cache API responses or pages: this is a live CRM, so every
// request should hit the network for fresh data. Static icons are cached opportunistically.

const STATIC_CACHE = "pipeline-crm-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticIcon = url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json";

  if (!isStaticIcon || event.request.method !== "GET") {
    return; // let the browser handle everything else normally (always network)
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      cache.put(event.request, response.clone());
      return response;
    })
  );
});
