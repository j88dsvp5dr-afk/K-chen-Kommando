const CACHE_NAME = "verena-os-v2";

// Alle statischen Assets die gecacht werden sollen
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/static/js/vendors~main.chunk.js",
  "/static/css/main.chunk.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install: Cache alle statischen Assets
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Einzelne Fehler nicht crashen lassen
        console.log("SW: Einige Assets konnten nicht gecacht werden:", err);
      });
    })
  );
});

// Activate: Alte Caches loeschen
self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// Fetch: Strategie je nach Request-Typ
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API-Calls (Claude, Supabase) — NIEMALS cachen, nur Network
  if (
    url.pathname.startsWith("/claude") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("anthropic.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // KI offline — leere JSON-Antwort damit App nicht crasht
        return new Response(
          JSON.stringify({
            content: [{ text: "Offline — KI nicht verfuegbar. Deine Daten sind lokal gespeichert." }],
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // Navigations-Requests (HTML) — Network first, dann Cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Erfolgreiche Antwort auch im Cache updaten
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: aus Cache laden
          return caches.match("/index.html").then(
            (cached) => cached || new Response("Offline", { status: 503 })
          );
        })
    );
    return;
  }

  // Statische Assets — Cache first, dann Network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((response) => {
          // Nur erfolgreiche Responses cachen
          if (response.ok && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Asset offline nicht verfuegbar — leise scheitern
          return new Response("", { status: 503 });
        });
    })
  );
});

// Push notification empfangen
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || "Verena OS";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
    actions: data.actions || [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});

// Lokale Erinnerungen pruefen
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "CHECK_TERMINE") {
    const termine = e.data.termine || [];
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);

    termine.forEach((termin) => {
      const d = new Date(termin.datum);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((d - heute) / 86400000);

      if (diff === 1) {
        self.registration.showNotification("Morgen: " + termin.title, {
          body: termin.time ? "Um " + termin.time + " Uhr" : "Ganztaegig",
          icon: "/icon-192.png",
          vibrate: [200, 100, 200],
        });
      }
      if (diff === 0) {
        self.registration.showNotification("Heute: " + termin.title, {
          body: termin.time ? "Um " + termin.time + " Uhr — vergiss es nicht!" : "Heute!",
          icon: "/icon-192.png",
          vibrate: [300, 100, 300],
        });
      }
    });
  }

  // Online-Status-Sync vom App-Client
  if (e.data && e.data.type === "ONLINE_STATUS") {
    // Broadcast an alle offenen Tabs
    clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: "ONLINE_STATUS_UPDATE",
          online: e.data.online,
        });
      });
    });
  }
});
