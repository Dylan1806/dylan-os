const BUILD = "__BUILD_ID__";
const CACHE = `dylan-os-shell-${BUILD}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/api.js",
  "./js/dates.js",
  "./js/ding.js",
  "./js/dom.js",
  "./js/model.js",
  "./js/spotify.js",
  "./js/views.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  const fresh = event.request.mode === "navigate" || url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/index.html");
  const request = fresh ? new Request(event.request, { cache: "no-store" }) : event.request;
  event.respondWith(
    fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
  );
});
