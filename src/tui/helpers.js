export const parseDiceArg = (rawDice) => {
  if (typeof rawDice !== 'string' || rawDice.trim().length === 0) return null

  const dice = rawDice
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value))

  return dice.length > 0 ? dice : null
}

export const parsePlayersArg = (rawPlayers) => {
  if (typeof rawPlayers !== 'string' || rawPlayers.trim().length === 0) return null

  const players = rawPlayers
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  return players.length >= 2 ? players : null
}

export const formatStatus = (snapshot) => {
  if (!snapshot) {
    return {
      currentPlayer: 'aucun',
      winner: 'aucun',
      activeTurn: 'aucun',
      stagedRoll: 'aucun',
      scores: ['Aucune partie active. Appuyez sur n pour commencer.'],
    }
  }

  const currentPlayer = snapshot.players[snapshot.currentPlayerIndex]
  const activeTurn = snapshot.activeTurn
  const pendingRoll = snapshot.pendingRoll

  return {
    currentPlayer: currentPlayer.name,
    winner: snapshot.winnerIndex === null ? 'aucun' : snapshot.players[snapshot.winnerIndex].name,
    activeTurn: activeTurn
      ? `turnScore=${activeTurn.turnScore}, diceToRoll=${activeTurn.diceToRoll}, canSteal=${activeTurn.canSteal}`
      : 'aucun',
    stagedRoll: pendingRoll ? pendingRoll.rolledDice.join(',') : 'aucun',
    scores: snapshot.players.map((player, index) => {
      const marker = index === snapshot.currentPlayerIndex ? '>' : ' '
      return `${marker} ${player.name}: ${player.score} pts (fails: ${player.failedTurnsInRow})`
    }),
  }
}
