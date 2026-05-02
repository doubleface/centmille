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
    expect(() =>
      validateSavePayload({
        metadata: { game: 'centmille', formatVersion: 2, mode: 'unknown' },
        snapshot: {},
      })
    ).toThrow('unsupported mode')
  })

  it('writes and reads a valid save file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'centmille-save-'))
    const file = join(dir, 'save.json')
    const snapshot = { players: [{ name: 'Alice' }, { name: 'Bob' }] }

    const written = await writeSaveFile(file, snapshot)
    expect(written.filePath).toContain('save.json')
    expect(written.payload.metadata.game).toBe('centmille')
    expect(written.payload.metadata.formatVersion).toBe(2)
    expect(written.payload.metadata.mode).toBe('dice')

    const manualFile = join(dir, 'manual-save.json')
    const manualWritten = await writeSaveFile(manualFile, snapshot, { mode: 'manual' })
    expect(manualWritten.payload.metadata.mode).toBe('manual')

    const loaded = await readSaveFile(file)
    expect(loaded.filePath).toBe(written.filePath)
    expect(loaded.payload.snapshot).toEqual(snapshot)
  })

  it('rejects unsupported write mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'centmille-save-mode-'))
    const file = join(dir, 'save.json')

    await expect(writeSaveFile(file, {}, { mode: 'foo' })).rejects.toThrow('Invalid save mode')
  })

  it('throws on invalid json content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'centmille-save-invalid-'))
    const file = join(dir, 'bad.json')
    writeFileSync(file, '{not json', 'utf-8')
    await expect(readSaveFile(file)).rejects.toThrow()
  })
})
