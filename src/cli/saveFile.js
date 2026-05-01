import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const validateSavePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid save file: root JSON object expected')
  }

  if (!payload.metadata || typeof payload.metadata !== 'object') {
    throw new Error('Invalid save file: missing metadata object')
  }

  if (payload.metadata.game !== 'centmille') {
    throw new Error('Invalid save file: metadata.game must be "centmille"')
  }

  if (payload.metadata.formatVersion !== 1) {
    throw new Error('Invalid save file: unsupported formatVersion')
  }

  if (!payload.snapshot || typeof payload.snapshot !== 'object') {
    throw new Error('Invalid save file: missing snapshot object')
  }
}

export const readSaveFile = async (file) => {
  const filePath = resolve(file)
  const rawContent = await readFile(filePath, 'utf-8')
  const payload = JSON.parse(rawContent)
  validateSavePayload(payload)
  return { filePath, payload }
}

export const writeSaveFile = async (file, snapshot) => {
  const filePath = resolve(file)
  const payload = {
    metadata: {
      formatVersion: 1,
      game: 'centmille',
      savedAt: new Date().toISOString(),
      source: 'cli',
    },
    snapshot,
  }

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

  return { filePath, payload }
}
