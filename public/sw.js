/*
 * Luna Space service worker (FR-PLAT-08, FR-PLAT-15, ADR 0022).
 * - Caches the app shell and the build's hashed assets, so repeat loads are fast and the app
 *   opens offline (NFR-PERF-01). API calls to Supabase are never cached.
 * - A new deployment ships a new BUILD_ID; the new worker waits until the app asks it to take
 *   over ("Update available" → Reload), so nobody's screen changes under them.
 * - Shows Web Push notifications and opens the linked page when one is clicked.
 */
const BUILD_ID = '__BUILD_ID__'
const SHELL = `luna-shell-${BUILD_ID}`
const ASSETS = 'luna-assets'
const SHELL_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS])
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Pages: the network first (always fresh), the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            void caches.open(SHELL).then((c) => c.put('/', copy))
          }
          return res
        })
        .catch(async () => (await caches.match('/')) || (await caches.match('/offline.html'))),
    )
    return
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              void caches.open(ASSETS).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Luna Space', body: event.data ? event.data.text() : '' }
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/notifications'
  event.waitUntil(
    self.registration.showNotification(data.title || 'Luna Space', {
      body: data.body || '',
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(target) : undefined))
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
