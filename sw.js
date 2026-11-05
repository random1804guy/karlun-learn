const CACHE_NAME = "karlun-learn-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/course/initial-course.js",
  "./src/config/defaults.js",
  "./src/core/answer-checker.js",
  "./src/core/lesson-engine.js",
  "./src/core/utils.js",
  "./src/importer/master-plan.js",
  "./src/progress/progression.js",
  "./src/review/scheduler.js",
  "./src/storage/store.js",
  "./src/backup/backup.js",
  "./public/icons/icon.svg",
  "./public/icons/icon-180.png",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("karlun-learn-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, copy).catch(() => {});
      }
      return response;
    } catch {
      if (request.mode === "navigate") return (await caches.match("./index.html")) || Response.error();
      return new Response("This item is not available offline yet.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
