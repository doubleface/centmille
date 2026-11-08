export const TABLE_EVENTS = Object.freeze([
  {
    id: 'happy-hour',
    name: '🍹 Happy Hour',
    emoji: '🍹',
    type: 'declarative',
    soundId: 'table-event',
    description: 'Les 5 valent 100 pts pendant ce tour de table !',
  },
  {
    id: 'tempete',
    name: '🌪️ Tempête',
    emoji: '🌪️',
    type: 'auto',
    soundId: 'table-event',
    description: 'Toutes les collisions font chuter de 2 paliers au lieu d’un.',
  },
  {
    id: 'fete-des-2',
    name: '🎉 Fête des 2',
    emoji: '🎉',
    type: 'declarative',
    soundId: 'table-event',
    description: 'Un brelan de 2 vaut 2 000 pts pendant ce tour de table !',
  },
  {
    id: 'treve',
    name: '🕊️ Trêve',
    emoji: '🕊️',
    type: 'auto',
    soundId: 'table-event',
    description: 'Aucune collision ne se déclenche pendant ce tour de table.',
  },
  {
    id: 'sens-inverse',
    name: '🔃 Sens inverse',
    emoji: '🔃',
    type: 'auto',
    soundId: 'table-event',
    description: 'Inverse le sens de rotation des joueurs pour ce tour de table.',
  },
  {
    id: 'pluie-de-cartes',
    name: '🌧️ Pluie de cartes',
    emoji: '🌧️',
    type: 'auto',
    soundId: 'table-event',
    description: 'Effet immédiat : chaque joueur reçoit 1 carte Commune.',
  },
  {
    id: 'mutinerie',
    name: '🏴‍☠️ Mutinerie',
    emoji: '🏴‍☠️',
    type: 'auto',
    soundId: 'table-event',
    description: 'Effet immédiat : le dernier vole 1 carte au hasard dans la main du premier.',
  },
  {
    id: 'tour-eclair',
    name: '⚡ Tour éclair',
    emoji: '⚡',
    type: 'declarative',
    soundId: 'table-event',
    description: 'Les 1 valent 200 pts pendant ce tour de table !',
  },
])

export const findTableEvent = (id) => TABLE_EVENTS.find((event) => event.id === id) ?? null

export const drawTableEvent = (rng = Math.random) => {
  const index = Math.floor(rng() * TABLE_EVENTS.length)
  return TABLE_EVENTS[Math.min(index, TABLE_EVENTS.length - 1)]
}
