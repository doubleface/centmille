export class PlayerState {
  constructor(name) {
    this.name = name
    this.score = 0
    this.previousCheckpointScore = 0
    this.checkpointHistory = [0]
    this.hasOpened = false
    this.failedTurnsInRow = 0
  }

  validateTurn(turnScore) {
    this.score += turnScore
    this.hasOpened = true
    this.failedTurnsInRow = 0

    this.checkpointHistory.push(this.score)
    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  dropToPreviousCheckpoint() {
    if (this.checkpointHistory.length > 1) {
      this.checkpointHistory.pop()
    }

    this.score = this.checkpointHistory.at(-1) ?? 0
    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  failTurn() {
    this.failedTurnsInRow += 1

    if (this.failedTurnsInRow >= 3) {
      this.dropToPreviousCheckpoint()
      this.failedTurnsInRow = 0
      return { checkpointDrop: true }
    }

    return { checkpointDrop: false }
  }
}
