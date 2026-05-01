import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSaveFile, validateSavePayload, writeSaveFile } from './saveFile.js'

describe('saveFile', () => {
  it('validates required payload fields', () => {
    expect(() => validateSavePayload(null)).toThrow('root JSON object expected')
    expect(() => validateSavePayload({})).toThrow('missing metadata object')
    expect(() => validateSavePayload({ metadata: {}, snapshot: {} })).toThrow(
      'metadata.game must be "centmille"'
    )
    expect(() => validateSavePayload({ metadata: { game: 'centmille' }, snapshot: {} })).toThrow(
      'unsupported formatVersion'
    )
    expect(() =>
      validateSavePayload({ metadata: { game: 'centmille', formatVersion: 1 }, snapshot: null })
    ).toThrow('missing snapshot object')
  })

  it('writes and reads a valid save file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'centmille-save-'))
    const file = join(dir, 'save.json')
    const snapshot = { players: [{ name: 'Alice' }, { name: 'Bob' }] }

    const written = await writeSaveFile(file, snapshot)
    expect(written.filePath).toContain('save.json')
    expect(written.payload.metadata.game).toBe('centmille')

    const loaded = await readSaveFile(file)
    expect(loaded.filePath).toBe(written.filePath)
    expect(loaded.payload.snapshot).toEqual(snapshot)
  })

  it('throws on invalid json content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'centmille-save-invalid-'))
    const file = join(dir, 'bad.json')
    writeFileSync(file, '{not json', 'utf-8')
    await expect(readSaveFile(file)).rejects.toThrow()
  })
})
