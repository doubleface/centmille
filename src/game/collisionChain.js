export function applyCollisionChain(players, justValidatedIndex, options = {}) {
  if (!Array.isArray(players) || players.length === 0) return []
  if (
    !Number.isInteger(justValidatedIndex) ||
    justValidatedIndex < 0 ||
    justValidatedIndex >= players.length
  ) {
    return []
  }

  const { truce = false, directDropCount = 1, cascadeDropCount = 1 } = options ?? {}
  if (truce) return []

  const collisions = []
  const queue = [justValidatedIndex]

  while (queue.length > 0) {
    const triggerPlayerIndex = queue.shift()
    const triggerPlayer = players[triggerPlayerIndex]

    if (triggerPlayer.score <= 0) continue

    for (const [candidateIndex, candidate] of players.entries()) {
      if (candidateIndex === triggerPlayerIndex) continue
      if (candidate.status?.ghost) continue
      if (candidate.score !== triggerPlayer.score) continue

      const previousScore = candidate.score
      const isDirect = triggerPlayerIndex === justValidatedIndex
      const drops = isDirect ? directDropCount : cascadeDropCount

      if (typeof candidate.dropMultipleCheckpoints === 'function') {
        candidate.dropMultipleCheckpoints(drops)
      } else {
        candidate.dropToPreviousCheckpoint()
      }

      if (candidate.score !== previousScore) {
        collisions.push({
          victimIndex: candidateIndex,
          attackerIndex: triggerPlayerIndex,
          player: candidate.name,
          attacker: triggerPlayer.name,
          from: previousScore,
          to: candidate.score,
          isDirect,
        })

        if (candidate.score > 0) {
          queue.push(candidateIndex)
        }
      }
    }
  }

  return collisions
}
