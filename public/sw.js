const CACHE_NAME = 'buildmate-workforce-v4.1';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch(() => {
        // Ignore individual asset failure during dev build
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      ),
    ])
  );
});

async function broadcastOfflineSync() {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_OFFLINE_QUEUE',
      timestamp: Date.now(),
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'buildmate-workforce-sync') {
    event.waitUntil(broadcastOfflineSync());
  }
});

self.addEventListener('message', (event) => {
  if (
    event.data &&
    (event.data.type === 'TRIGGER_OFFLINE_SYNC' ||
      event.data.type === 'CLIENT_READY')
  ) {
    event.waitUntil(broadcastOfflineSync());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip caching API requests so live Supabase queries always hit network first
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (url.origin === self.location.origin ||
            url.hostname.includes('fonts.googleapis.com') ||
            url.hostname.includes('fonts.gstatic.com'))
        ) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const indexCached = await caches.match('/index.html');
          if (indexCached) return indexCached;
        }
        return new Response('Offline Mode — BuildMate IndexedDB active', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
