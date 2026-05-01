import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const runInteractiveCli = (input) => {
  return spawnSync('node', ['--import', 'tsx', './bin/centmille.js', 'interactive'], {
    cwd: process.cwd(),
    input,
    encoding: 'utf-8',
  })
}

describe('centmille CLI integration', () => {
  it('supports new -> play -> save -> load -> continue flow', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'centmille-cli-'))
    const saveFile = join(tempDir, 'save.json')

    const firstSession = runInteractiveCli(
      `new --players=Alice,Bob\nroll --dice=5,5,5,2,2\nkeep --dice=5,5,5\nstop\nsave --file=${saveFile}\nquit\n`
    )

    expect(firstSession.status).toBe(0)
    expect(firstSession.stdout).toContain('"command": "save"')

    const savedContent = JSON.parse(readFileSync(saveFile, 'utf-8'))
    expect(savedContent.metadata.game).toBe('centmille')
    expect(savedContent.snapshot.players[0].score).toBe(500)

    const secondSession = runInteractiveCli(
      `load --file=${saveFile}\nstatus\nroll --dice=1,2,3,4,6\nstatus\nquit\n`
    )

    expect(secondSession.status).toBe(0)
    expect(secondSession.stdout).toContain('"command": "load"')
    expect(secondSession.stdout).toContain('Current player: Bob')
    expect(secondSession.stdout).toContain('Staged roll: 1,2,3,4,6')
  })
})
