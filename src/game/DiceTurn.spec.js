import { describe, expect, it } from 'vitest'
import {
  diceStopReason,
  diceToRoll,
  newDiceTurn,
  restoreDiceTurn,
  rollDiceTurn,
  scoreDice,
} from './DiceTurn.js'

describe('barème de base, de un à cinq dés', () => {
  it.each([
    [[1], 100, 1],
    [[5], 50, 1],
    [[2], 0, 0],
    [[1, 1, 5, 5, 2], 300, 4],
    [[1, 1, 1], 1000, 3],
    [[1, 1, 1, 1], 2000, 4],
    [[1, 1, 1, 1, 1], 4000, 5],
    [[5, 5, 5], 500, 3],
    [[5, 5, 5, 5], 1000, 4],
    [[5, 5, 5, 5, 5], 2000, 5],
    [[6, 6, 6], 600, 3],
    [[2, 2, 2, 2], 400, 4],
    [[3, 3, 3, 3, 3], 1200, 5],
    [[4, 4, 4, 1, 2], 500, 4],
    [[3, 3, 3, 1, 5], 450, 5],
    [[1, 1, 1, 1, 5], 2050, 5],
    [[5, 2, 4, 1, 3], 1500, 5],
    [[6, 2, 3, 5, 4], 1500, 5],
    [[2, 2, 3, 4, 6], 0, 0],
    [[5, 5, 5, 1, 2], 600, 4],
  ])('%j vaut %i, garde %i dés', (faces, points, kept) => {
    const result = scoreDice(faces)
    expect(result.points).toBe(points)
    expect(result.keptIndices).toHaveLength(kept)
    expect(new Set(result.keptIndices).size).toBe(kept)
    expect(result.groups.reduce((sum, group) => sum + group.points, 0)).toBe(points)
  })

  it.each([
    [],
    [0],
    [7],
    [1.5],
    ['1'],
    [NaN],
    [1, 1, 1, 1, 1, 1],
    null,
  ])('rejette le lancer invalide %j', (faces) => {
    expect(() => scoreDice(faces)).toThrow()
  })

  it('égale la meilleure partition disjointe sur les 9 330 lancers ordonnés possibles', () => {
    // Independent oracle: enumerate all subsets and partitions, using a literal tariff.
    const tariff = new Map([
      ['1', 100],
      ['5', 50],
      ['12345', 1500],
      ['23456', 1500],
      ['111', 1000],
      ['1111', 2000],
      ['11111', 4000],
      ['222', 200],
      ['2222', 400],
      ['22222', 800],
      ['333', 300],
      ['3333', 600],
      ['33333', 1200],
      ['444', 400],
      ['4444', 800],
      ['44444', 1600],
      ['555', 500],
      ['5555', 1000],
      ['55555', 2000],
      ['666', 600],
      ['6666', 1200],
      ['66666', 2400],
    ])
    let checked = 0
    for (let size = 1; size <= 5; size++) {
      for (let encoded = 0; encoded < 6 ** size; encoded++) {
        const faces = Array.from({ length: size }, (_, i) => (Math.floor(encoded / 6 ** i) % 6) + 1)
        const best = Array(1 << size).fill(0)
        for (let mask = 1; mask < best.length; mask++) {
          for (let subset = mask; subset; subset = (subset - 1) & mask) {
            const key = faces
              .filter((_, i) => subset & (1 << i))
              .sort()
              .join('')
            best[mask] = Math.max(best[mask], (tariff.get(key) || 0) + best[mask ^ subset])
          }
        }
        const result = scoreDice(faces)
        expect(result.points, faces.join(',')).toBe(best.at(-1))
        expect(new Set(result.keptIndices).size).toBe(result.keptIndices.length)
        for (const group of result.groups) {
          expect(
            tariff.get(
              group.indices
                .map((i) => faces[i])
                .sort()
                .join('')
            ) ||
              (group.indices.length === 2 && (faces[group.indices[0]] === 1 ? 200 : 100))
          ).toBe(group.points)
        }
        checked++
      }
    }
    expect(checked).toBe(9330)
  })
})

describe('tour automatique et restauration', () => {
  const unopened = { hasOpened: false }
  const opened = { hasOpened: true }

  it('réserve tous les dés sans modifier le tour précédent', () => {
    const original = newDiceTurn()
    const turn = rollDiceTurn(original, [5, 5, 5, 1, 2])
    expect(original.rolls).toEqual([])
    expect(original.total).toBe(0)
    expect(diceStopReason(original, unopened)).toMatch(/Lancez/)
    expect(turn.total).toBe(600)
    expect(turn.dice.filter((die) => die.kept).map((die) => die.face)).toEqual([5, 5, 5, 1])
    expect(diceToRoll(turn)).toBe(1)
    expect(diceStopReason(turn, unopened)).toBe('')
  })

  it('bloque 150, respecte ouverture et minimum personnalisé', () => {
    const turn = rollDiceTurn(newDiceTurn(), [1, 5, 2, 3, 6])
    expect(diceStopReason(turn, unopened)).toContain('multiple de 100')
    expect(diceStopReason(turn, unopened)).toContain('encore 350')
    const hundred = rollDiceTurn(newDiceTurn(), [1, 2, 2, 3, 6])
    expect(diceStopReason(hundred, unopened)).toContain('encore 400')
    expect(diceStopReason(hundred, opened)).toBe('')
    expect(diceStopReason(hundred, unopened, 100)).toBe('')
    const fiveHundred = rollDiceTurn(newDiceTurn(), [5, 5, 5, 2, 3])
    expect(diceStopReason(fiveHundred, unopened)).toBe('')
    const fiveFifty = rollDiceTurn(fiveHundred, [5, 2])
    expect(diceStopReason(fiveFifty, unopened)).toContain('multiple')
  })

  it('ne fusionne pas les lancers et ne recompte pas la réserve', () => {
    let turn = rollDiceTurn(newDiceTurn(), [1, 2, 2, 3, 6])
    expect(() => rollDiceTurn(turn, [1, 1, 1, 1, 1])).toThrow(/libres/)
    turn = rollDiceTurn(turn, [1, 2, 2, 3])
    turn = rollDiceTurn(turn, [1, 2, 3])
    expect(turn.total).toBe(300)
    expect(turn.dice.filter((die) => die.kept).map((die) => die.face)).toEqual([1, 1, 1])
    expect(diceToRoll(turn)).toBe(2)
  })

  it('relance une main pleine en conservant le cumul', () => {
    const full = rollDiceTurn(newDiceTurn(), [2, 3, 4, 5, 6])
    expect(full.dice.every((die) => die.kept)).toBe(true)
    expect(diceToRoll(full)).toBe(5)
    expect(diceStopReason(full, unopened)).toBe('')
    const next = rollDiceTurn(full, [1, 2, 2, 3, 6])
    expect(next.total).toBe(1600)
    expect(next.dice.filter((die) => die.kept)).toEqual([{ face: 1, kept: true }])
    expect(full.dice.every((die) => die.kept)).toBe(true)
    expect(diceStopReason(rollDiceTurn(newDiceTurn(), [3, 3, 3, 1, 5]), unopened)).toContain(
      'multiple'
    )
  })

  it('conserve les faces ratées et les points perdus sans nouveau lancer', () => {
    const before = rollDiceTurn(newDiceTurn(), [5, 5, 5, 2, 3])
    const bust = rollDiceTurn(before, [2, 3])
    expect(bust.phase).toBe('bust')
    expect(bust.total).toBe(0)
    expect(bust.lost).toBe(500)
    expect(bust.dice.filter((die) => !die.kept).map((die) => die.face)).toEqual([2, 3])
    expect(diceStopReason(bust, unopened)).toMatch(/Broucouille/)
    expect(() => rollDiceTurn(bust, [1, 1])).toThrow(/terminé/)
    expect(restoreDiceTurn(JSON.parse(JSON.stringify(bust)))).toEqual(bust)
  })

  it('reprend le cumul et la réserve sans permettre l’arrêt avant le nouveau lancer', () => {
    const previous = [[5, 5, 5, 2, 3]]
    const turn = newDiceTurn(previous)
    expect(turn.total).toBe(500)
    expect(turn.rolls).toEqual([])
    expect(diceStopReason(turn, unopened)).toMatch(/Lancez/)
    expect(diceToRoll(turn)).toBe(2)
    const next = rollDiceTurn(turn, [1, 1])
    expect(next.total).toBe(700)
    expect(diceStopReason(next, unopened)).toBe('')
    expect(restoreDiceTurn({ ...next, total: 999999 })).toEqual(next)
    previous[0][0] = 2
    expect(turn.inheritedRolls[0][0]).toBe(5)
    expect(() => newDiceTurn('invalid')).toThrow(/invalide/)
    expect(() => newDiceTurn([[2, 2, 3, 4, 6]])).toThrow(/invalide/)
    expect(() => newDiceTurn([[1, 5, 2, 3, 6]])).toThrow(/invalide/)
  })

  it('recalcule un état sauvé depuis les vrais lancers, pas depuis un total édité', () => {
    const turn = rollDiceTurn(newDiceTurn(), [5, 5, 5, 1, 2])
    const restored = restoreDiceTurn({ ...turn, total: 999999 })
    expect(restored.total).toBe(600)
    expect(restored).toEqual(turn)
    expect(restoreDiceTurn(newDiceTurn())).toEqual(newDiceTurn())
    expect(() => restoreDiceTurn(null)).toThrow(/invalide/)
    expect(() => restoreDiceTurn({ rolls: 'wrong' })).toThrow(/invalide/)
    expect(() => restoreDiceTurn({ rolls: [[1]] })).toThrow(/libres/)
  })
})
