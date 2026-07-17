const CACHE_NAME = "wahane-cache-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./public/icon-192.svg",
  "./public/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

const NETWORK_FIRST = ["document", "script", "style"];

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const cachePut = (response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  };

  if (NETWORK_FIRST.includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request).then(cachePut).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then(cachePut).catch(() => caches.match("./index.html"));
    })
  );
});
