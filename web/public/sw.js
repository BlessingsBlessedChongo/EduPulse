/* EduPulse's service worker. It lets the app be installed on a phone and open
   quickly on a weak connection.

   It keeps only the app's own files (screens, fonts, icons). It never keeps
   anything from /api: notes, questions and marks are always fetched fresh, so
   nothing private is left behind on a shared phone. */
const CACHE = 'edupulse-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname === '/health') return; // always live

  // Opening a screen: the newest version when online, the saved app when not.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Built files carry a fingerprint in their name, so a saved copy is always the right one.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((saved) => saved || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
