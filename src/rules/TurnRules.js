export class TurnRules {
  canStop(turnScore) {
    return turnScore > 0 && turnScore % 100 === 0
  }

  canOpen(turnScore) {
    return turnScore >= 500
  }

  isExactWin(currentScore, turnScore) {
    return currentScore + turnScore === 10000
  }

  isOvershoot(currentScore, turnScore) {
    return currentScore + turnScore > 10000
  }
}
