const CACHE_NAME = "comuni-ai-v9";
const APP_FILES = [
  "./", 
  "./index.html", 
  "./assets/css/styles.css", 
  "./assets/js/app.js", 
  "./assets/js/db.js",
  "./assets/js/translator.js",
  "./assets/js/translation.js",
  "./assets/js/predictor.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.status === 200 && isSameOrigin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(error => {
      if (isSameOrigin && event.request.mode === "navigate") return caches.match("./index.html");
      throw error;
    });
  }));
});