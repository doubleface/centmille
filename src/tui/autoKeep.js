export const selectAutoKeptDice = (rolledDice) => {
  if (!Array.isArray(rolledDice) || rolledDice.length === 0) return []

  const sorted = [...rolledDice].sort((a, b) => a - b)
  const straight = sorted.join(',')
  if (straight === '1,2,3,4,5' || straight === '2,3,4,5,6') {
    return [...rolledDice]
  }

  const counts = new Map()
  for (const value of rolledDice) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const keptCounts = new Map()

  for (const [value, count] of counts.entries()) {
    if (count >= 3) keptCounts.set(value, count)
  }

  const onesCount = counts.get(1) ?? 0
  if (onesCount > 0 && onesCount < 3) keptCounts.set(1, onesCount)

  const fivesCount = counts.get(5) ?? 0
  if (fivesCount > 0 && fivesCount < 3) keptCounts.set(5, fivesCount)

  const remaining = new Map(keptCounts)
  const keptDice = []

  for (const value of rolledDice) {
    const left = remaining.get(value) ?? 0
    if (left > 0) {
      keptDice.push(value)
      remaining.set(value, left - 1)
    }
  }

  return keptDice
}
