const CACHE_NAME = "edusmart-cache-v1";

const FILES_TO_CACHE = [
  "./",
  "./login.html",
  "./index.html",
  "./analytics.html",
  "./attendance.html",
  "./style.css",
  "./script.js",
  "./login.js",
  "./analytics.js",
  "./attendance.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
