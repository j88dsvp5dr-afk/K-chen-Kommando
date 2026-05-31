const CACHE_NAME = "verena-os-v1";

// Install
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
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
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/");
    })
  );
});

// Lokale Erinnerungen pruefen (wird taeglich aufgerufen)
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
});
