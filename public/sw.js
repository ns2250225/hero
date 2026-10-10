/* Service Worker：缓存应用外壳与构建产物，实现离线可玩。
 * - 页面导航（HTML）：网络优先，离线时回退缓存。保证新版本部署后不会加载失效的旧资源。
 * - 带哈希的构建资源（/assets/）：缓存优先，内容不可变。
 * - 其他同源资源：网络优先并更新缓存。
 */
const CACHE = 'pixel-horde-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function putCache(req, res) {
  if (!res || !res.ok) return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
}

function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      putCache(req, res);
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            putCache(req, res);
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(networkFirst(req));
});
