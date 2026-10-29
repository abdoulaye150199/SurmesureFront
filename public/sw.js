const CACHE_NAME = 'sur-mesure-style-v7';
const APP_SHELL = [
  '/manifest.webmanifest',
  '/assets/favicon.png',
  '/assets/pwa-icon-180.png',
  '/assets/pwa-icon-192.png',
  '/assets/pwa-icon-512.png',
  '/assets/sur-mesure-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch('/', { cache: 'reload' });
  if (!page.ok) throw new Error('Unable to download the application shell.');

  await cache.put('/', page.clone());
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname !== '/');

  await Promise.all([
    ...APP_SHELL.map((path) => cache.add(path)),
    ...assets.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Unable to cache ${url.pathname}.`);
      await cache.put(url, response);
    }),
  ]);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('sur-mesure-style-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isApiRequest = requestUrl.hostname === 'backendsurmesure.onrender.com'
    || requestUrl.pathname.startsWith('/v1/');
  const isNavigation = event.request.mode === 'navigate';
  const isAppCode = event.request.destination === 'script' || event.request.destination === 'style';

  if (isApiRequest) {
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ message: 'Connexion Internet requise pour cette action.', statusCode: 503 }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  if (isNavigation || isAppCode) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cacheRequest = isNavigation ? '/' : event.request;
          await caches.open(CACHE_NAME).then((cache) => cache.put(cacheRequest, response.clone()));
        }
        return response;
      } catch {
        const cached = await caches.match(event.request);
        const appShell = isNavigation ? await caches.match('/') : undefined;
        return cached || appShell || new Response('Cette ressource est indisponible hors connexion.', { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') {
        await caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    } catch {
      return new Response('', { status: 503 });
    }
  })());
});
