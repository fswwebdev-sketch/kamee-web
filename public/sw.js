/* Service worker Kamee Coffee (PWA).
 *
 * Strategi:
 * - Navigasi halaman  : network-first (batas 4 dtk) → salinan cache → /offline.html
 * - Payload RSC Next  : network-first → cache (navigasi sisi klien tetap jalan saat offline)
 * - /_next/static     : cache-first (nama file ber-hash, immutable)
 * - Gambar & font     : stale-while-revalidate, maks 150 entri
 * - API katalog publik: network-first → cache (menu, kategori, outlet, promo, banner tetap tampil offline)
 * - TIDAK pernah dicache: request non-GET, /admin, /api (route handler Next), request ber-Authorization
 *   (data akun/pesanan pelanggan), pembayaran, dan endpoint pribadi lainnya.
 *
 * URL API dikirim saat registrasi: /sw.js?api=<origin+path API>.
 */
const VERSION = "kamee-v2"; // naikkan saat aset/brand berubah agar cache lama dibuang
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const IMAGES = `${VERSION}-images`;
const DATA = `${VERSION}-data`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

const API = new URL(self.location.href).searchParams.get("api") || "";
const PUBLIC_API = /\/(products|categories|outlets|promotions|banners|blogs|blog-categories|testimonials|settings\/public)(\/|\?|$)/;
const PRIVATE_API = /\/(me|orders|payments|otp|auth|customer|admin|reviews\/mine)(\/|\?|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Hanya aset kecil; halaman dicache saat dikunjungi (tidak membebani server/jaringan saat instal)
      const cache = await caches.open(STATIC);
      await cache.addAll(PRECACHE);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("kamee-") && !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request, cacheName, { ms = 4000, fallback, preload } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([(preload && (await preload)) || fetch(request), timeout(ms)]);
    if (response && response.ok && response.type !== "opaqueredirect") cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (fallback) return (await caches.match(fallback)) || Response.error();
    return Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(event.request, response.clone()).then(() => trim(cacheName, max));
      }
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // API backend (lintas origin)
  if (API && request.url.startsWith(API)) {
    if (request.headers.has("authorization") || PRIVATE_API.test(url.pathname) || !PUBLIC_API.test(url.pathname)) return;
    event.respondWith(networkFirst(request, DATA, { ms: 5000 }));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/") || url.pathname === "/sw.js" || url.pathname.startsWith("/mockServiceWorker")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES, { ms: 4000, fallback: OFFLINE_URL, preload: event.preloadResponse }));
    return;
  }
  // Payload RSC untuk navigasi sisi klien Next.js
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, PAGES, { ms: 4000 }));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (url.pathname.startsWith("/_next/image") || /\.(png|jpe?g|webp|avif|svg|gif|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, IMAGES, 150));
  }
});
