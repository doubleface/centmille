import { describe, expect, it } from 'vitest'
import { scoreDice } from './DiceTurn.js'

// Oracle indépendant : partitions disjointes ; seuls les groupes Aimant peuvent traverser les lancers.
const baseTariff = new Map([
  ['1', 100],
  ['5', 50],
  ['12345', 1500],
  ['23456', 1500],
  ['111', 1000],
  ['1111', 2000],
  ['11111', 4000],
  ['111111', 8000],
  ['222', 200],
  ['2222', 400],
  ['22222', 800],
  ['222222', 1600],
  ['333', 300],
  ['3333', 600],
  ['33333', 1200],
  ['333333', 2400],
  ['444', 400],
  ['4444', 800],
  ['44444', 1600],
  ['444444', 3200],
  ['555', 500],
  ['5555', 1000],
  ['55555', 2000],
  ['555555', 4000],
  ['666', 600],
  ['6666', 1200],
  ['66666', 2400],
  ['666666', 4800],
])

describe('Aimant contre partitions indépendantes, sans double comptage', () => {
  it.each(
    [null, 'happy-hour', 'tour-eclair', 'fete-des-2'].flatMap((eventId) =>
      [1, 5].map((magnetFace) => ({ eventId, magnetFace }))
    )
  )('%j : 9 330 seconds lancers ordonnés, réserve de1à5 dés', ({ eventId, magnetFace }) => {
    const tariff = new Map(baseTariff)
    if (eventId === 'happy-hour') tariff.set('5', 100)
    if (eventId === 'tour-eclair') tariff.set('1', 200)
    if (eventId === 'fete-des-2')
      for (const [key, value] of [
        ['222', 2000],
        ['2222', 4000],
        ['22222', 8000],
        ['222222', 16000],
      ])
        tariff.set(key, value)
    const cache = new Map()
    let checked = 0
    for (let prior = 1; prior <= 5; prior++) {
      const count = 6 - prior
      const previous =
        prior < 3
          ? prior * tariff.get(String(magnetFace))
          : tariff.get(String(magnetFace).repeat(prior))
      for (let encoded = 0; encoded < 6 ** count; encoded++) {
        const faces = Array.from(
          { length: count },
          (_, i) => (Math.floor(encoded / 6 ** i) % 6) + 1
        )
        const key = `${prior}:${[...faces].sort().join('')}`
        if (!cache.has(key)) {
          const hand = [...Array(prior).fill(magnetFace), ...faces]
          const best = Array.from({ length: 1 << hand.length }, () => ({ points: 0, kept: 0 }))
          for (let mask = 1; mask < best.length; mask++) {
            for (let subset = mask; subset; subset = (subset - 1) & mask) {
              const indices = hand.flatMap((_, i) => (subset & (1 << i) ? [i] : []))
              if (indices.some((i) => i < prior) && !indices.every((i) => hand[i] === magnetFace))
                continue
              const group = indices
                .map((i) => hand[i])
                .sort()
                .join('')
              if (!tariff.has(group)) continue
              const points = tariff.get(group) + best[mask ^ subset].points
              const kept = indices.length + best[mask ^ subset].kept
              if (
                points > best[mask].points ||
                (points === best[mask].points && kept > best[mask].kept)
              )
                best[mask] = { points, kept }
            }
          }
          cache.set(key, best.at(-1))
        }
        const expected = cache.get(key)
        const actual = scoreDice(faces, { eventId, magnetFace, magnetCount: prior })
        expect(previous + actual.points, `${prior}/${faces}`).toBe(expected.points)
        expect(actual.keptIndices).toHaveLength(expected.kept - prior)
        expect(new Set(actual.keptIndices).size).toBe(actual.keptIndices.length)
        checked++
      }
    }
    expect(checked).toBe(9330)
    expect(cache.size).toBe(461)
  }, 15000)

  it.each([
    { magnetFace: 2 },
    { magnetCount: -1 },
    { magnetCount: 0.5 },
    { magnetFace: 1, magnetCount: 6 },
  ])('rejette un regroupement impossible %j', (options) => {
    expect(() => scoreDice([1], options)).toThrow(/Aimant invalide/)
  })
})
