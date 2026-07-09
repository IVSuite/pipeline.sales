// Minimal service worker — exists mainly to satisfy PWA installability criteria.
// Deliberately does NOT cache API responses or pages: this is a live CRM, so every
// request should hit the network for fresh data. Static icons are cached opportunistically.

const STATIC_CACHE = "pipeline-crm-static-v2";

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

  // Network-first: correctness matters more than the negligible bandwidth saved by
  // caching these small files, and a stale/bad cached response would otherwise stick
  // around forever with no way to self-heal.
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw new Error("Network request failed and no cache entry available");
      }
    })
  );
});
