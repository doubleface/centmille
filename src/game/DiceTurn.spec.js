import { describe, expect, it } from 'vitest'
import {
  diceStopReason,
  diceToRoll,
  diceTurnScore,
  newDiceTurn,
  restoreDiceTurn,
  rollDiceTurn,
  scoreDice,
  setDiceCapacity,
} from './DiceTurn.js'

describe('barème de base, de un à six dés', () => {
  it.each([
    'playing',
    'ready',
  ])('refuse un changement de capacité après un lancer, même avec phase%s incohérente', (phase) => {
    const turn = { ...rollDiceTurn(newDiceTurn(), [1, 2, 2, 3, 6]), phase }
    const before = structuredClone(turn)
    expect(() => setDiceCapacity(turn, 6)).toThrow(/avant le premier lancer/)
    expect(turn).toEqual(before)
  })
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
    [[1, 2, 3, 4, 5, 6], 1600, 6],
    [[1, 1, 2, 3, 4, 5], 1600, 6],
    [[2, 3, 4, 5, 5, 6], 1550, 6],
    [[1, 1, 1, 2, 2, 2], 1200, 6],
    [[2, 2, 2, 5, 5, 5], 700, 6],
    [[1, 1, 2, 2, 5, 5], 300, 4],
    [[2, 2, 3, 3, 4, 4], 0, 0],
    ...[
      [1, 8000],
      [2, 1600],
      [3, 2400],
      [4, 3200],
      [5, 4000],
      [6, 4800],
    ].map(([face, points]) => [Array(6).fill(face), points, 6]),
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
    [1, 1, 1, 1, 1, 1, 1],
    null,
  ])('rejette le lancer invalide %j', (faces) => {
    expect(() => scoreDice(faces)).toThrow()
  })

  it.each(
    [null, 'happy-hour', 'tour-eclair', 'fete-des-2'].flatMap((eventId) =>
      [false, true].map((petiteSuite) => ({ eventId, petiteSuite }))
    )
  )('égale l’oracle sur55 986 lancers ordonnés, %j', ({ petiteSuite, eventId }) => {
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
      ['111111', 8000],
      ['222222', 1600],
      ['333333', 2400],
      ['444444', 3200],
      ['555555', 4000],
      ['666666', 4800],
    ])
    if (petiteSuite) for (const key of ['1234', '2345', '3456']) tariff.set(key, 1000)
    if (eventId === 'happy-hour') tariff.set('5', 100)
    if (eventId === 'tour-eclair') tariff.set('1', 200)
    if (eventId === 'fete-des-2')
      for (const [key, points] of [
        ['222', 2000],
        ['2222', 4000],
        ['22222', 8000],
        ['222222', 16000],
      ])
        tariff.set(key, points)
    let checked = 0
    const expectedByMultiset = new Map()
    for (let size = 1; size <= 6; size++) {
      for (let encoded = 0; encoded < 6 ** size; encoded++) {
        const faces = Array.from({ length: size }, (_, i) => (Math.floor(encoded / 6 ** i) % 6) + 1)
        const multiset = [...faces].sort().join('')
        if (!expectedByMultiset.has(multiset)) {
          const best = Array.from({ length: 1 << size }, () => ({ points: 0, kept: 0 }))
          for (let mask = 1; mask < best.length; mask++) {
            for (let subset = mask; subset; subset = (subset - 1) & mask) {
              const key = faces
                .filter((_, i) => subset & (1 << i))
                .sort()
                .join('')
              if (!tariff.has(key)) continue
              const points = tariff.get(key) + best[mask ^ subset].points
              const kept = key.length + best[mask ^ subset].kept
              if (
                points > best[mask].points ||
                (points === best[mask].points && kept > best[mask].kept)
              ) {
                best[mask] = { points, kept }
              }
            }
          }
          expectedByMultiset.set(multiset, best.at(-1))
        }
        const expected = expectedByMultiset.get(multiset)
        const result = scoreDice(faces, { petiteSuite, eventId })
        expect(result.points, faces.join(',')).toBe(expected.points)
        expect(result.keptIndices).toHaveLength(expected.kept)
        expect(new Set(result.keptIndices).size).toBe(result.keptIndices.length)
        for (const group of result.groups) {
          expect(
            tariff.get(
              group.indices
                .map((i) => faces[i])
                .sort()
                .join('')
            ) ||
              (group.indices.length === 2 && tariff.get(String(faces[group.indices[0]])) * 2)
          ).toBe(group.points)
        }
        checked++
      }
    }
    expect(checked).toBe(55986)
    expect(expectedByMultiset.size).toBe(923)
  }, 15000)
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

  it('distingue cumul brut et score après cartes pour les centaines et l’ouverture', () => {
    const turn = rollDiceTurn(newDiceTurn(), [1, 1, 5, 2, 3])
    expect(turn.total).toBe(250)
    expect(diceTurnScore(turn)).toBe(250)
    const modifiers = { arrondi: true, doubleur: true }
    expect(diceTurnScore(turn, modifiers)).toBe(600)
    expect(diceStopReason(turn, unopened, 500, modifiers)).toBe('')
    expect(diceStopReason(turn, unopened, 500, { arrondi: true })).toContain('encore 200')
    expect(diceStopReason(turn, unopened, 500, { doubleur: true })).toContain('multiple')
    expect(diceStopReason(turn, unopened, 500, { doubleur: true })).not.toContain('Ouverture')
    expect(turn.total).toBe(250)
    expect(turn.dice.filter((die) => die.kept)).toHaveLength(3)
    expect(diceStopReason(newDiceTurn(), unopened, 500, modifiers)).toContain('Lancez')
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

  it('reprend le montant validé après cartes et remultiplie tout le cumul', () => {
    const offer = { rolls: [[5, 5, 5, 2, 3]], total: 1000, diceCount: 5 }
    const inherited = newDiceTurn(offer)
    expect(inherited.total).toBe(1000)
    expect(inherited.inheritedTotal).toBe(1000)
    expect(diceStopReason(inherited, unopened, 500, { doubleur: true })).toMatch(/Lancez/)
    const next = rollDiceTurn(inherited, [1, 2])
    expect(next.total).toBe(1100)
    expect(diceTurnScore(next, { doubleur: true })).toBe(2200)
    expect(restoreDiceTurn(JSON.parse(JSON.stringify({ ...next, total: 50000 })))).toEqual(next)
    const bust = rollDiceTurn(inherited, [2, 3])
    expect(bust.lost).toBe(1000)
    expect(bust.total).toBe(0)
    expect(restoreDiceTurn(bust)).toEqual(bust)
    // Un brut de250 arrondi à300 est une offre valide malgré ses faces hors centaine.
    expect(newDiceTurn({ rolls: [[1, 1, 5, 2, 3]], total: 300 }).total).toBe(300)
    for (const total of [-100, 0, 150, 1.5, '1000']) {
      expect(() => newDiceTurn({ ...offer, total })).toThrow(/invalide/)
    }
    expect(() => newDiceTurn({ rolls: [], total: 1000 })).toThrow(/invalide/)
    expect(() => newDiceTurn(null)).toThrow(/invalide/)
    expect(() => newDiceTurn([], 4)).toThrow(/invalide/)
    expect(() => setDiceCapacity(newDiceTurn(), 4)).toThrow(/invalide/)
    const failedOffer = { ...offer, fromBust: true }
    expect(() => newDiceTurn({ ...failedOffer, failedFaces: [2] })).toThrow(/broucouille invalide/)
    expect(() => newDiceTurn({ ...failedOffer, failedFaces: [1, 2] })).toThrow(
      /broucouille invalide/
    )
  })

  it('réserve six dés, relance la main pleine6 et restaure une reprise6 sans changer de capacité', () => {
    const initial = newDiceTurn([], 6)
    const full = rollDiceTurn(initial, [1, 2, 3, 4, 5, 6])
    expect(full.total).toBe(1600)
    expect(full.dice.every((die) => die.kept)).toBe(true)
    expect(diceToRoll(full)).toBe(6)
    const next = rollDiceTurn(full, [1, 2, 2, 3, 3, 4])
    expect(next.total).toBe(1700)
    expect(diceToRoll(next)).toBe(5)
    expect(restoreDiceTurn(next)).toEqual(next)
    const inherited = newDiceTurn({ rolls: full.rolls, total: 3200, diceCount: 6 })
    expect(inherited.total).toBe(3200)
    expect(diceToRoll(inherited)).toBe(6)
    expect(restoreDiceTurn(inherited)).toEqual(inherited)
    expect(rollDiceTurn(inherited, [2, 2, 2, 3, 3, 3]).total).toBe(3700)
    expect(initial.dice.every((die) => die.face === null)).toBe(true)
  })

  it('recalcule un état sauvé depuis les vrais lancers, pas depuis un total édité', () => {
    const turn = rollDiceTurn(newDiceTurn(), [5, 5, 5, 1, 2])
    const restored = restoreDiceTurn({ ...turn, total: 999999 })
    expect(restored.total).toBe(600)
    expect(restored).toEqual(turn)
    expect(restoreDiceTurn(newDiceTurn())).toEqual(newDiceTurn())
    const legacy = { ...rollDiceTurn(newDiceTurn([[5, 5, 5, 2, 3]]), [1, 2]) }
    delete legacy.actions
    delete legacy.diceCount
    delete legacy.inheritedTotal
    expect(restoreDiceTurn(legacy).total).toBe(600)
    expect(() => restoreDiceTurn(null)).toThrow(/invalide/)
    expect(() => restoreDiceTurn({ rolls: 'wrong' })).toThrow(/invalide/)
    expect(() => restoreDiceTurn({ rolls: [], actions: [] })).toThrow(/Tour de dés invalide/)
    expect(() =>
      restoreDiceTurn({
        rolls: [],
        actions: [{ type: 'start', diceCount: 5 }, { type: 'unknown' }],
      })
    ).toThrow(/Action de dés invalide/)
    expect(() => restoreDiceTurn({ rolls: [[1]] })).toThrow(/libres/)
  })
})
