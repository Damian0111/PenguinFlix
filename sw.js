const CACHE_NAME = 'penguinflix-cache-v1';
const URLS_TO_CACHE = [
  '/',
  'index.html'
];

// Instalacja Service Workera i buforowanie zasobów
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otwarto cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Aktywacja Service Workera i czyszczenie starych cache
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Przechwytywanie zapytań sieciowych
self.addEventListener('fetch', event => {
  // Ignoruj zapytania do API, aby zawsze pobierać świeże dane
  if (event.request.url.includes('api.themoviedb.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jeśli zasób jest w cache, zwróć go
        if (response) {
          return response;
        }
        // W przeciwnym razie, pobierz z sieci
        return fetch(event.request);
      })
  );
});
