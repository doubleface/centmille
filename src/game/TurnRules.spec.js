import { describe, expect, it } from 'vitest'
import { TurnRules } from './TurnRules.js'

describe('TurnRules', () => {
  const rules = new TurnRules()

  it('allows stopping on a multiple of 100', () => {
    expect(rules.canStop(300)).toBe(true)
  })

  it('forbids stopping on a non-multiple of 100', () => {
    expect(rules.canStop(250)).toBe(false)
  })

  it('allows opening from 500 points', () => {
    expect(rules.canOpen(500)).toBe(true)
    expect(rules.canOpen(450)).toBe(false)
  })

  it('detects an exact win at 10,000', () => {
    expect(rules.isExactWin(9800, 200)).toBe(true)
  })

  it('detects score overshoot above 10,000', () => {
    expect(rules.isOvershoot(9900, 200)).toBe(true)
  })
})
