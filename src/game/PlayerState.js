export class PlayerState {
  constructor(name) {
    this.name = name
    this.score = 0
    this.previousCheckpointScore = 0
    this.checkpointHistory = [0]
    this.hasOpened = false
    this.failedTurnsInRow = 0

    this.hand = []
    this.achievements = []
    this.highestTierReached = 0
    this.unrewardedDrops = 0
    this.hasEnteredRedZoneBefore = false
    this.scoreBeforeLastDrop = null
    this.exactTiersClaimed = []
    this.status = {
      frozen: false,
      cursed: false,
      ghost: false,
      vampire: false,
      extraTurn: false,
    }
  }

  validateTurn(turnScore) {
    this.score += turnScore
    this.hasOpened = true
    this.failedTurnsInRow = 0

    this.checkpointHistory.push(this.score)
    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  dropMultipleCheckpoints(count = 1) {
    const drops = Math.max(0, Math.floor(count))
    if (drops === 0) return

    if (this.score > 0) {
      this.scoreBeforeLastDrop = this.score
    }

    for (let i = 0; i < drops; i++) {
      if (this.checkpointHistory.length > 1) {
        this.checkpointHistory.pop()
      } else {
        break
      }
    }

    this.score = this.checkpointHistory.at(-1) ?? 0
    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  dropToPreviousCheckpoint() {
    this.dropMultipleCheckpoints(1)
  }

  dropHalfGap() {
    const from = this.score
    const to = this.previousCheckpointScore

    if (from > 0) {
      this.scoreBeforeLastDrop = from
    }

    const loss = Math.floor((from - to) / 200) * 100
    const newScore = from - loss

    if (this.checkpointHistory.length > 1) {
      this.checkpointHistory.pop()
    }

    if (newScore > to) {
      this.checkpointHistory.push(newScore)
    }

    this.score = this.checkpointHistory.at(-1) ?? 0
    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  adjustScore(delta) {
    const newScore = Math.max(0, this.score + delta)
    this.score = newScore

    if (this.checkpointHistory.length > 1) {
      this.checkpointHistory.pop()
    }
    while (this.checkpointHistory.length > 1 && this.checkpointHistory.at(-1) >= newScore) {
      this.checkpointHistory.pop()
    }
    if (newScore > 0) {
      this.checkpointHistory.push(newScore)
    }

    this.previousCheckpointScore = this.checkpointHistory.at(-2) ?? 0
  }

  failTurn(options = {}) {
    const { extraPenalty = 0 } = options ?? {}
    this.failedTurnsInRow += 1 + extraPenalty

    if (this.failedTurnsInRow >= 3) {
      this.dropToPreviousCheckpoint()
      this.failedTurnsInRow = 0
      return { checkpointDrop: true }
    }

    return { checkpointDrop: false }
  }

  toSnapshot() {
    return {
      name: this.name,
      score: this.score,
      previousCheckpointScore: this.previousCheckpointScore,
      checkpointHistory: [...this.checkpointHistory],
      hasOpened: this.hasOpened,
      failedTurnsInRow: this.failedTurnsInRow,
      hand: [...this.hand],
      achievements: [...this.achievements],
      highestTierReached: this.highestTierReached,
      unrewardedDrops: this.unrewardedDrops,
      hasEnteredRedZoneBefore: this.hasEnteredRedZoneBefore,
      scoreBeforeLastDrop: this.scoreBeforeLastDrop,
      exactTiersClaimed: [...this.exactTiersClaimed],
      status: { ...this.status },
    }
  }

  static fromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Snapshot must be an object')
    }

    const player = new PlayerState(snapshot.name ?? '')
    player.score = snapshot.score ?? 0
    player.previousCheckpointScore = snapshot.previousCheckpointScore ?? 0
    player.checkpointHistory = Array.isArray(snapshot.checkpointHistory)
      ? [...snapshot.checkpointHistory]
      : [0, player.score]
    player.hasOpened = Boolean(snapshot.hasOpened)
    player.failedTurnsInRow = snapshot.failedTurnsInRow ?? 0

    player.hand = Array.isArray(snapshot.hand) ? [...snapshot.hand] : []
    player.achievements = Array.isArray(snapshot.achievements) ? [...snapshot.achievements] : []
    player.highestTierReached = snapshot.highestTierReached ?? 0
    player.unrewardedDrops = snapshot.unrewardedDrops ?? 0
    player.hasEnteredRedZoneBefore = Boolean(snapshot.hasEnteredRedZoneBefore)
    player.scoreBeforeLastDrop = snapshot.scoreBeforeLastDrop ?? null
    player.exactTiersClaimed = Array.isArray(snapshot.exactTiersClaimed)
      ? [...snapshot.exactTiersClaimed]
      : []
    player.status = {
      frozen: Boolean(snapshot.status?.frozen),
      cursed: Boolean(snapshot.status?.cursed),
      ghost: Boolean(snapshot.status?.ghost),
      vampire: Boolean(snapshot.status?.vampire),
      extraTurn: Boolean(snapshot.status?.extraTurn),
    }

    return player
  }
}
