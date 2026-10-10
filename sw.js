const CACHE = "sujood-v1";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const PRECACHE = [
  "/",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      const stale = names.filter(function (name) {
        return name !== CACHE;
      });

      return Promise.all(stale.map(function (name) {
        return caches.delete(name);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function saveCopy(request, response) {
  const copy = response.clone();

  caches.open(CACHE).then(function (cache) {
    cache.put(request, copy);
  });

  return response;
}

function networkFirst(request) {
  const pagePath = new URL(request.url).pathname;

  return fetch(request).then(function (response) {
    return response.ok ? saveCopy(pagePath, response) : response;
  }).catch(function () {
    return caches.match(pagePath).then(function (cached) {
      return cached || caches.match("/");
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {
    const refresh = fetch(request).then(function (response) {
      const isCacheable = response.ok || response.type === "opaque";

      return isCacheable ? saveCopy(request, response) : response;
    });

    if (cached) {
      refresh.catch(function () {});
      return cached;
    }

    return refresh;
  });
}

self.addEventListener("fetch", function (event) {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isPage = request.mode === "navigate" && url.origin === self.location.origin;
  const isFont = FONT_HOSTS.includes(url.hostname);
  const isOwnAsset = url.origin === self.location.origin;

  if (isPage) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isFont || isOwnAsset) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
