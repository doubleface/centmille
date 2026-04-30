import { describe, expect, it } from 'vitest'
import { DiceScorer } from './DiceScorer.js'

describe('DiceScorer', () => {
  const scorer = new DiceScorer()

  it('scores a single 1', () => {
    const result = scorer.scoreRoll([1, 2, 3, 4, 6])
    expect(result.score).toBe(100)
    expect(result.scoringDiceCount).toBe(1)
  })

  it('scores a single 5', () => {
    const result = scorer.scoreRoll([5, 2, 2, 4, 6])
    expect(result.score).toBe(50)
    expect(result.scoringDiceCount).toBe(1)
  })

  it('scores three 1s', () => {
    const result = scorer.scoreRoll([1, 1, 1, 2, 3])
    expect(result.score).toBe(1000)
  })

  it('scores three 4s', () => {
    const result = scorer.scoreRoll([4, 4, 4, 2, 3])
    expect(result.score).toBe(400)
  })

  it('scores four of a kind as triple x2', () => {
    const result = scorer.scoreRoll([2, 2, 2, 2, 6])
    expect(result.score).toBe(400)
  })

  it('scores five of a kind as four of a kind x2', () => {
    const result = scorer.scoreRoll([6, 6, 6, 6, 6])
    expect(result.score).toBe(2400)
  })

  it('scores a 1-5 straight', () => {
    const result = scorer.scoreRoll([1, 2, 3, 4, 5])
    expect(result.score).toBe(1500)
    expect(result.scoringDiceCount).toBe(5)
  })

  it('scores 0 when no scoring dice are rolled', () => {
    const result = scorer.scoreRoll([2, 3, 4, 6, 2])
    expect(result.score).toBe(0)
    expect(result.scoringDiceCount).toBe(0)
  })
})
