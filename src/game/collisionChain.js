export function applyCollisionChain(players, justValidatedIndex) {
  if (!Array.isArray(players) || players.length === 0) return
  if (!Number.isInteger(justValidatedIndex)) return
  if (justValidatedIndex < 0 || justValidatedIndex >= players.length) return

  const queue = [justValidatedIndex]

  while (queue.length > 0) {
    const triggerPlayerIndex = queue.shift()
    const triggerPlayer = players[triggerPlayerIndex]

    for (const [candidateIndex, candidate] of players.entries()) {
      if (candidateIndex === triggerPlayerIndex) continue
      if (candidate.score !== triggerPlayer.score) continue

      const previousScore = candidate.score
      candidate.dropToPreviousCheckpoint()

      if (candidate.score !== previousScore) {
        queue.push(candidateIndex)
      }
    }
  }
}
