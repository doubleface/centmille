const isStraight = (dice) => {
  if (dice.length !== 5) return false

  const sorted = [...dice].sort((a, b) => a - b)
  const isLowStraight = sorted.join(',') === '1,2,3,4,5'
  const isHighStraight = sorted.join(',') === '2,3,4,5,6'

  return isLowStraight || isHighStraight
}

const getTripletBaseScore = (value) => {
  if (value === 1) return 1000
  return value * 100
}

export class DiceScorer {
  scoreRoll(dice) {
    if (!Array.isArray(dice) || dice.length === 0) {
      return { score: 0, scoringDiceCount: 0, combinations: [] }
    }

    if (isStraight(dice)) {
      return {
        score: 1500,
        scoringDiceCount: 5,
        combinations: ['straight'],
      }
    }

    const counts = new Map()
    for (const value of dice) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    let score = 0
    let scoringDiceCount = 0
    const combinations = []

    for (const [value, count] of counts.entries()) {
      if (count < 3) continue

      const baseScore = getTripletBaseScore(value)
      const multiplier = count === 3 ? 1 : count === 4 ? 2 : 4
      score += baseScore * multiplier
      scoringDiceCount += count
      combinations.push(`${count}-of-a-kind-${value}`)
    }

    const onesCount = counts.get(1) ?? 0
    const fivesCount = counts.get(5) ?? 0

    if (onesCount > 0 && onesCount < 3) {
      score += onesCount * 100
      scoringDiceCount += onesCount
      combinations.push(`single-1-x${onesCount}`)
    }

    if (fivesCount > 0 && fivesCount < 3) {
      score += fivesCount * 50
      scoringDiceCount += fivesCount
      combinations.push(`single-5-x${fivesCount}`)
    }

    return { score, scoringDiceCount, combinations }
  }
}
