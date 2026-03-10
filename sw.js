const CACHE_NAME = 'penguinflix-cache-v3'; // Zmienione na v3, żeby wymusić przejęcie kontroli
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otwarto cache. Dodawanie zasobów: ', URLS_TO_CACHE);
        return cache.addAll(URLS_TO_CACHE);
      })
      // KLUCZOWE 1: Zmusza nowego Service Workera do pominięcia kolejki i natychmiastowej instalacji
      .then(() => self.skipWaiting()) 
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    // KLUCZOWE 2: Nowy Service Worker natychmiast przejmuje kontrolę nad otwartą kartą
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorujemy zapytania do zewnętrznego API
  if (event.request.url.includes('api.themoviedb.org') || event.request.url.includes('youtube.com')) {
    return;
  }
  
  // KLUCZOWE 3: Strategia "Network First" (Najpierw sieć, potem Cache)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jeśli mamy internet i serwer odpowiada, pobieramy najnowszą wersję
        // i od razu zapisujemy/aktualizujemy ją w pamięci podręcznej.
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Złapanie błędu (.catch) nastąpi tylko, gdy NIE MASZ INTERNETU.
        // Wtedy i tylko wtedy wyciągamy starą wersję aplikacji z pamięci.
        return caches.match(event.request);
      })
  );
});
