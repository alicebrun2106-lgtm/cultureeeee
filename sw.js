// CULTURE!!! — Service Worker
// Stratégie :
//   - HTML (index.html) : network-first → toujours la dernière version si en ligne,
//     fallback sur le cache si hors ligne
//   - JS/CSS/manifest : network-first → l'app installée reste alignée avec le site
//   - images/assets : cache-first → instant offline, refresh en background
//   - Si pas de réseau du tout : on sert ce qu'on a en cache

const CACHE_VERSION = "v59";
const CACHE_NAME = "culture-" + CACHE_VERSION;

// Ressources à pré-cacher dès l'install (le minimum pour que l'app se lance offline).
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/duck-1.png",
  "./assets/duck-2.png",
  "./assets/duck-3.png",
  "./assets/duck-4.png",
  "./assets/duck-1.webp",
  "./assets/duck-2.webp",
  "./assets/duck-3.webp",
  "./assets/duck-4.webp"
];

// ───── INSTALL : précache du minimum vital ─────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll échoue si UNE seule URL fail ; on tente une à une pour rester tolérant.
      return Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ───── ACTIVATE : on nettoie les vieux caches ─────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ───── FETCH : stratégie par type ─────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // On ne gère que les GET — pour POST/PUT etc. on laisse passer
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin (fonts Google, GitHub etc.) → pass-through, pas de cache
  if (url.origin !== self.location.origin) return;

  // HTML : network-first
  const isHTML = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // JS/CSS/manifest : network-first pour éviter qu'une PWA installée garde
  // une ancienne logique de paquets pendant que le site web a déjà été mis à jour.
  const isFreshAppShell =
    req.destination === "script" ||
    req.destination === "style" ||
    url.pathname.endsWith("/manifest.json");
  if (isFreshAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Images et autres assets : cache-first avec refresh en background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        // On stocke uniquement les réponses valides
        if (res && res.status === 200 && res.type !== "opaque") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached); // hors-ligne : on renvoie le cache
      return cached || fetchPromise;
    })
  );
});

// Permet à l'app de demander explicitement de skipWaiting (mise à jour immédiate).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// Clic sur une notification du canard → ouvre l'app sur le bon paquet
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si une fenêtre est déjà ouverte → focus + navigate
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon en ouvrir une nouvelle
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
