/* Open-house iPad: open with no Wi-Fi (Vlad 11/7).
 *
 * Controls /open-house/ only. Keeps the page, its fonts and every listing
 * photo it has shown on the iPad, so the sign-in opens even when the house
 * has no internet. Guests signed in offline are already kept on the iPad by
 * the page itself (kz_oh_queue) and sent once it is back online.
 *
 *  - The page: from the network when it answers within 4 seconds (so fixes
 *    still arrive), otherwise the last copy kept.
 *  - Fonts and photos: the kept copy at once, refreshed in the background.
 *  - Everything else (sign-ins, the CRM): untouched.
 */
// The page (warmPhotos in index.html) writes listing photos into this same
// cache by name, so change both together.
var CACHE = "kz-open-house-v1";
var PAGE = "/open-house/";
var CORE = [
  PAGE,
  "/open-house/manifest.webmanifest",
  "/fonts/bodoni-moda-latin.woff2",
  "/fonts/jost-latin.woff2",
  "/img/equal-housing-opportunity.svg",
  "/apple-touch-icon.png",
  "/favicon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // One missing file must not stop the rest from being kept.
    return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("kz-open-house-") === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function pageFromNetwork(req) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("slow")); }, 4000);
    fetch(req, { cache: "no-store" }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) return reject(new Error("HTTP " + res.status));
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(PAGE, copy); });
      resolve(res);
    }, function (err) { clearTimeout(timer); reject(err); });
  });
}

function keptFirst(e) {
  var req = e.request;
  return caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      });
      if (hit) { e.waitUntil(fresh.catch(function () {})); return hit; }
      return fresh;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // The page itself, whatever ?home= it carries.
  if (req.mode === "navigate" && url.origin === location.origin && url.pathname.indexOf(PAGE) === 0) {
    e.respondWith(pageFromNetwork(req).catch(function () {
      return caches.match(PAGE).then(function (hit) { return hit || fetch(req); });
    }));
    return;
  }

  // Fonts and photos, from this site or a listing photo hosted elsewhere.
  var asset = req.destination === "image" || req.destination === "font" ||
    (url.origin === location.origin && /\.(woff2|jpe?g|png|webp|svg|webmanifest)$/i.test(url.pathname));
  if (asset) e.respondWith(keptFirst(e));
});
