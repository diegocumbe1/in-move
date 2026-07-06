/* In Move — Service Worker mínimo.
 * Objetivo: cumplir el requisito de instalabilidad (Android / desktop Chrome)
 * y dar un fallback offline básico. NO cachea datos sensibles de valoraciones.
 * Estrategia:
 *   - Navegaciones (documentos): network-first con fallback a caché.
 *   - Estáticos same-origin (icons, manifest, _next/static): stale-while-revalidate.
 */
const VERSION = 'in-move-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Documentos → network-first (siempre datos frescos de valoración).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Estáticos → stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          return res;
        });
        return cached || network;
      }),
    );
  }
});
