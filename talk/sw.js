/* 即時翻譯 — Service Worker
   只負責把 App 外殼（HTML／圖示／設定檔）存起來，讓沒網路時也開得起來。
   翻譯用的是別網域的 API，一律不攔截、不快取，直接讓它走網路。 */

const CACHE = 'rt-shell-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // 個別 addAll 會因為單一檔案失敗而整批中斷，改成逐一容錯
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 翻譯 API：不碰

  // 網路優先，拿得到就順手更新快取；斷網就用快取回應
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || caches.match('./index.html'))
      )
  );
});
