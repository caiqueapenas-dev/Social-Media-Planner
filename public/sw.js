const CACHE_NAME = "social-media-planner-v2"; // Incrementamos a versão do cache

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting()); // Força o novo SW a ativar
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Torna o SW o controlador da página imediatamente
  );
});

self.addEventListener("fetch", (event) => {
  // Para requisições de navegação (páginas HTML), sempre tente a rede primeiro.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/")) // Se falhar, mostra a página principal do cache
    );
    return;
  }

  // Para outros recursos (CSS, JS, imagens), use a estratégia "cache first"
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
      );
    })
  );
});
