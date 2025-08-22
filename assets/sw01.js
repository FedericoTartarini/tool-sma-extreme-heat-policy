if( 'function' === typeof importScripts) {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');
}

// self.addEventListener("message", (event) => {
//   if (event.data && event.data.type === "SKIP_WAITING") {
//     self.skipWaiting();
//   }
// });
//
// self.addEventListener('install', async (event) => {
// let offlineFallbackPage = "./assets/offline.html";
// let CACHE = "pwabuilder-offline-page";
//   event.waitUntil(
//     caches.open(CACHE)
//       .then((cache) => cache.add(offlineFallbackPage))
//   );
// });
//
// self.addEventListener('fetch', (event) => {
// let CACHE = "pwabuilder-offline-page";
// let offlineFallbackPage = "./assets/offline.html";
//   if (event.request.mode === 'navigate') {
//     event.respondWith((async () => {
//       try {
//         const preloadResp = await event.preloadResponse;
//
//         if (preloadResp) {
//           return preloadResp;
//         }
//
//         const networkResp = await fetch(event.request);
//         return networkResp;
//       } catch (error) {
//
//         const cache = await caches.open(CACHE);
//         const cachedResp = await cache.match(offlineFallbackPage);
//         return cachedResp;
//       }
//     })());
//   }
// });

console.log('I am a Service Worker!');