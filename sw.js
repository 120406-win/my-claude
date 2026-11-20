// Zephyr PWA Service Worker
// 策略：同源请求一律网络优先——改完代码她刷新就是新版，缓存只在断网时兜底打开。
// 跨域请求（聊天接口、后端、音乐直链等）和音频/视频不拦截、不缓存。
const CACHE = 'zephyr-pwa-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const dest = req.destination;
  if (dest === 'audio' || dest === 'video') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

// ── Web Push：他在后端给你留言时，系统弹一条通知，点开回到栖 ──
self.addEventListener('push', (e) => {
  let data = { title: '夏辞', body: '' };
  try {
    if (e.data) {
      const j = e.data.json();
      if (j && (j.title || j.body)) data = { title: j.title || '夏辞', body: j.body || '' };
      else data.body = e.data.text();
    }
  } catch (err) {
    try { if (e.data) data.body = e.data.text(); } catch (err2) {}
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'zephyr-msg',
      data: { url: './' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
