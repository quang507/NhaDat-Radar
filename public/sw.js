// 2/11 (audit 🔴8): chỉ bắt điều hướng trang: mạng trước, rớt mạng thì trả /offline.html.
// KHÔNG cache HTML -> ISR/CDN giữ nguyên. Công tắc khẩn: deploy bản sw.js chỉ gọi self.registration.unregister().
const BAN = "radar-v1", OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(BAN).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== BAN) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.mode !== "navigate" || r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/auth") || u.pathname.startsWith("/api")) return;
  e.respondWith((async () => {
    try { return (await e.preloadResponse) || (await fetch(r)); }
    catch { return (await caches.match(OFFLINE)) || Response.error(); }
  })());
});
