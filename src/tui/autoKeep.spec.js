import { describe, expect, it } from 'vitest'
import { selectAutoKeptDice } from './autoKeep.js'

describe('selectAutoKeptDice', () => {
  it('keeps straight fully', () => {
    expect(selectAutoKeptDice([2, 6, 3, 5, 4])).toEqual([2, 6, 3, 5, 4])
  })

  it('keeps singles 1 and 5', () => {
    expect(selectAutoKeptDice([1, 2, 3, 5, 6])).toEqual([1, 5])
  })

  it('keeps n-of-kind and excludes single bonus for same value when >=3', () => {
    expect(selectAutoKeptDice([5, 5, 5, 1, 2])).toEqual([5, 5, 5, 1])
    expect(selectAutoKeptDice([1, 1, 1, 5, 2])).toEqual([1, 1, 1, 5])
  })

  it('returns empty on bust', () => {
    expect(selectAutoKeptDice([2, 2, 3, 4, 6])).toEqual([])
  })
})
