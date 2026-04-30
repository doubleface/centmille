export class PlayerState {
  constructor(name) {
    this.name = name
    this.score = 0
    this.previousCheckpointScore = 0
    this.hasOpened = false
    this.failedTurnsInRow = 0
  }

  validateTurn(turnScore) {
    this.previousCheckpointScore = this.score
    this.score += turnScore
    this.hasOpened = true
    this.failedTurnsInRow = 0
  }

  failTurn() {
    this.failedTurnsInRow += 1

    if (this.failedTurnsInRow >= 3) {
      this.score = this.previousCheckpointScore
      this.failedTurnsInRow = 0
      return { checkpointDrop: true }
    }

    return { checkpointDrop: false }
  }
}
