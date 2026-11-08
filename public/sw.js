const CACHE_NAME = 'centmille-v5'
const CORE_ASSETS = ['./manifest.webmanifest', './icon.svg']
const CARD_ASSETS = [
  './cards/aimant.jpg',
  './cards/annonceur.jpg',
  './cards/architecte.jpg',
  './cards/arrondi.jpg',
  './cards/aspirateur.jpg',
  './cards/assurance.jpg',
  './cards/aveugle.jpg',
  './cards/bis.jpg',
  './cards/bombe.jpg',
  './cards/boomerang.jpg',
  './cards/bouclier.jpg',
  './cards/cameleon.jpg',
  './cards/contrat.jpg',
  './cards/convertisseur.jpg',
  './cards/doubleur.jpg',
  './cards/duel.jpg',
  './cards/echo.jpg',
  './cards/effaceur.jpg',
  './cards/fantome.jpg',
  './cards/gel.jpg',
  './cards/main-faible.jpg',
  './cards/malediction.jpg',
  './cards/miroir.jpg',
  './cards/pandore.jpg',
  './cards/parachute.jpg',
  './cards/parieur.jpg',
  './cards/percepteur.jpg',
  './cards/petite-suite.jpg',
  './cards/pickpocket.jpg',
  './cards/reset.jpg',
  './cards/seconde-chance.jpg',
  './cards/sixieme-sens.jpg',
  './cards/sniper.jpg',
  './cards/teleporteur.jpg',
  './cards/tout-ou-rien.jpg',
  './cards/troc.jpg',
]
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
        await Promise.allSettled(CARD_ASSETS.map((asset) => cache.add(asset)))
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
        .then((response) => {
          if (!response.ok) {
            return caches.match('./', MATCH_OPTIONS) || response
          }
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(async () => (await caches.match('./', MATCH_OPTIONS)) || Response.error())
    })
  )
})
