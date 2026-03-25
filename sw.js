const CACHE_NAME = 'penguinflix-cache-v9'; // Wersja v6 wymusi aktualizację

// Twarde ścieżki dla GitHub Pages - to naprawia problem ze skrótem!
const URLS_TO_CACHE = [
  '/PenguinFlix/',
  '/PenguinFlix/index.html',
  '/PenguinFlix/styles.css',
  '/PenguinFlix/app.js',
  '/PenguinFlix/manifest.json',
  '/PenguinFlix/icon-192.png',
  '/PenguinFlix/icon-512.png',
  '/PenguinFlix/icon-maskable-192.png',
  '/PenguinFlix/icon-maskable-512.png',
  '/PenguinFlix/screen-mobile-1.png',
  '/PenguinFlix/screen-mobile-2.png'
];

self.addEventListener('install', (event) => {
    // USUNIĘTO self.skipWaiting(); - teraz Service Worker będzie czekał na przycisk!
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
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
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorujemy zapytania do zewnętrznego API TMDB oraz YouTube
  if (event.request.url.includes('api.themoviedb.org') || event.request.url.includes('image.tmdb.org') || event.request.url.includes('youtube.com')) {
    return;
  }
  
  // Strategia "Network First"
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
// --- NASŁUCHIWANIE NA KOMENDĘ AKTUALIZACJI Z APLIKACJI ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
