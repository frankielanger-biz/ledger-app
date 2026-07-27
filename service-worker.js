// service-worker.js
// Deliberately minimal: caches the static shell (HTML/CSS/JS) so the app
// installs cleanly and opens instantly. It does NOT cache API responses —
// your balances should always come in fresh from get-balances.

const CACHE_NAME = "ledger-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache calls to Supabase or Plaid — always go to the network.
  if (url.hostname.includes("supabase.co") || url.hostname.includes("plaid.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
