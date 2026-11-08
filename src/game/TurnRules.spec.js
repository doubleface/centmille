import { describe, expect, it } from 'vitest'
import { TurnRules } from './TurnRules.js'

describe('TurnRules', () => {
  const rules = new TurnRules()

  it('allows stopping on a multiple of 100', () => {
    expect(rules.canStop(300)).toBe(true)
  })

  it('forbids stopping on a non-multiple of 100 by default', () => {
    expect(rules.canStop(250)).toBe(false)
  })

  it('allows stopping on a non-multiple of 100 when allowNonMultipleOf100 is true if multiple of 50', () => {
    expect(rules.canStop(250, { allowNonMultipleOf100: true })).toBe(true)
    expect(rules.canStop(275, { allowNonMultipleOf100: true })).toBe(false)
  })

  it('rejects invalid or non-positive turn scores in canStop', () => {
    expect(rules.canStop(0)).toBe(false)
    expect(rules.canStop(-100)).toBe(false)
    expect(rules.canStop(150.5)).toBe(false)
    expect(rules.canStop(null)).toBe(false)
    expect(rules.canStop('500')).toBe(false)
  })

  it('handles null options in canStop', () => {
    expect(rules.canStop(300, null)).toBe(true)
    expect(rules.canStop(250, null)).toBe(false)
  })

  it('applies rounding when roundUpTo100 is true', () => {
    expect(rules.applyRounding(250, { roundUpTo100: true })).toBe(300)
    expect(rules.applyRounding(200, { roundUpTo100: true })).toBe(200)
    expect(rules.applyRounding(150, { roundUpTo100: true })).toBe(200)
  })

  it('does not round when roundUpTo100 is false or omitted', () => {
    expect(rules.applyRounding(250)).toBe(250)
    expect(rules.applyRounding(250, { roundUpTo100: false })).toBe(250)
    expect(rules.applyRounding(250, null)).toBe(250)
  })

  it('allows opening from 500 points with default settings', () => {
    expect(rules.canOpen(500)).toBe(true)
    expect(rules.canOpen(450)).toBe(false)
  })

  it('respects custom openingScore in constructor', () => {
    const customRules = new TurnRules({ openingScore: 1000 })
    expect(customRules.canOpen(900)).toBe(false)
    expect(customRules.canOpen(1000)).toBe(true)
  })

  it('detects an exact win at targetScore', () => {
    expect(rules.isExactWin(9800, 200)).toBe(true)
    expect(rules.isExactWin(9800, 100)).toBe(false)

    const centMilleRules = new TurnRules({ targetScore: 100000 })
    expect(centMilleRules.isExactWin(99000, 1000)).toBe(true)
    expect(centMilleRules.isExactWin(99000, 500)).toBe(false)
  })

  it('detects score overshoot above targetScore', () => {
    expect(rules.isOvershoot(9900, 200)).toBe(true)
    expect(rules.isOvershoot(9800, 200)).toBe(false)

    const centMilleRules = new TurnRules({ targetScore: 100000 })
    expect(centMilleRules.isOvershoot(99500, 1000)).toBe(true)
    expect(centMilleRules.isOvershoot(99000, 1000)).toBe(false)
  })

  it('handles null in constructor options safely', () => {
    const nullRules = new TurnRules(null)
    expect(nullRules.targetScore).toBe(10000)
    expect(nullRules.openingScore).toBe(500)
  })
})
