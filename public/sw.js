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
  const url = new URL(event.request.url);

  // Ignora completamente as requisições de API (Supabase e internas) do cache.
  // Elas sempre devem ir para a rede.
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.endsWith("supabase.co")
  ) {
    return; // Deixa o navegador lidar com a requisição, sem interceptar.
  }

  // Estratégia "Network First, then Cache" para todos os outros recursos.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          // Se a resposta da rede for bem-sucedida,
          // atualizamos o cache com a nova versão e a retornamos.
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Se a rede falhar, tentamos servir a partir do cache.
          return cache.match(event.request);
        });
    })
  );
});
