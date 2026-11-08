export class TurnRules {
  constructor(options = {}) {
    const { targetScore = 10000, openingScore = 500 } = options ?? {}
    this.targetScore = targetScore
    this.openingScore = openingScore
  }

  canStop(turnScore, options = {}) {
    const { allowNonMultipleOf100 = false } = options ?? {}

    if (!Number.isInteger(turnScore) || turnScore <= 0) {
      return false
    }

    if (allowNonMultipleOf100) {
      return turnScore % 50 === 0
    }

    return turnScore % 100 === 0
  }

  applyRounding(turnScore, options = {}) {
    const { roundUpTo100 = false } = options ?? {}

    if (roundUpTo100) {
      return Math.ceil(turnScore / 100) * 100
    }

    return turnScore
  }

  canOpen(turnScore) {
    return turnScore >= this.openingScore
  }

  isExactWin(currentScore, turnScore) {
    return currentScore + turnScore === this.targetScore
  }

  isOvershoot(currentScore, turnScore) {
    return currentScore + turnScore > this.targetScore
  }
}
