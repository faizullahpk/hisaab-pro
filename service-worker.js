/**
 * Hisaab Pro — Service Worker
 * App-shell precache + smart runtime caching so the app loads instantly
 * and works offline. Bump CACHE_VERSION to invalidate old caches.
 */
const CACHE_VERSION = "hisaab-pro-v2.0.0";
const APP_SHELL = `${CACHE_VERSION}-shell`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

// Precache the core shell (relative to SW scope)
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/variables.css",
  "./css/themes.css",
  "./css/reset.css",
  "./css/base.css",
  "./css/components.css",
  "./css/animations.css",
  "./css/layout.css",
  "./css/responsive.css",
  "./css/ui.css",
  "./js/main.js",
  "./config/env.js",
  "./config/app.config.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {/* tolerate a missing optional asset */}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache Firebase / Cloudinary / Google auth traffic — always network
  const bypass = ["firestore.googleapis.com", "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com", "api.cloudinary.com", "accounts.google.com",
    "apis.google.com", "www.googleapis.com"];
  if (bypass.some((h) => url.hostname.includes(h))) return;

  // Navigations → network-first, fall back to cached shell, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => { cachePut(RUNTIME, request, res.clone()); return res; })
        .catch(() => caches.match(request)
          .then((c) => c || caches.match("./index.html"))
          .then((c) => c || caches.match("./offline.html")))
    );
    return;
  }

  // Same-origin static assets → cache-first (fast, offline-friendly)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => { cachePut(APP_SHELL, request, res.clone()); return res; })
          .catch(() => cached))
    );
    return;
  }

  // Cross-origin (fonts, GSAP CDN) → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => { cachePut(RUNTIME, request, res.clone()); return res; }).catch(() => cached);
      return cached || network;
    })
  );
});

function cachePut(cacheName, request, response) {
  if (!response || response.status !== 200) return;
  caches.open(cacheName).then((cache) => cache.put(request, response)).catch(() => {});
}
