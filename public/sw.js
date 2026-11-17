const CACHE_NAME = 'centmille-v12'
const CORE_ASSETS = ['./manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png']
const MATCH_OPTIONS = { ignoreSearch: true, ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(CORE_ASSETS)
        if (!(await cache.match('./', MATCH_OPTIONS))) {
          await cache.add('./')
        }
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(event.request, MATCH_OPTIONS).then(async (cached) => {
      if (cached) return cached
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('./', MATCH_OPTIONS)
        if (shell) return shell
      }

      return fetch(event.request)
        .then(async (response) => {
          if (!response.ok) {
            if (event.request.mode === 'navigate') {
              return (await caches.match('./', MATCH_OPTIONS)) || response
            }
            return response
          }
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(async () => {
          if (event.request.mode === 'navigate') {
            return (await caches.match('./', MATCH_OPTIONS)) || Response.error()
          }
          return Response.error()
        })
    })
  )
})
