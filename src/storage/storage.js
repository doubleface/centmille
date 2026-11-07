const STORAGE_KEY = 'centmille:current-game'

const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage
}

export const makeManualSavePayload = (snapshot) => ({
  metadata: {
    formatVersion: 2,
    mode: 'manual',
    game: 'centmille',
    savedAt: new Date().toISOString(),
    source: 'web',
  },
  snapshot,
})

export const loadCurrentGame = () => {
  const storage = getStorage()
  if (!storage) return null

  const rawPayload = storage.getItem(STORAGE_KEY)
  if (!rawPayload) return null

  try {
    const payload = JSON.parse(rawPayload)
    if (!payload || typeof payload !== 'object') return null
    if (!payload.metadata || typeof payload.metadata !== 'object') return null
    if (payload.metadata.game !== 'centmille') return null
    if (payload.metadata.formatVersion !== 2) return null
    if (payload.metadata.mode !== 'manual') return null
    if (!payload.snapshot || typeof payload.snapshot !== 'object') return null

    return payload
  } catch {
    return null
  }
}

export const saveCurrentGame = (snapshot) => {
  const storage = getStorage()
  if (!storage) return null

  const payload = makeManualSavePayload(snapshot)
  storage.setItem(STORAGE_KEY, JSON.stringify(payload))

  return payload
}

export const clearCurrentGame = () => {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(STORAGE_KEY)
}

export { STORAGE_KEY }
