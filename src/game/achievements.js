export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'coup-declat',
    name: "Coup d'éclat",
    emoji: '🏆',
    soundId: 'achievement',
    description: 'Être le premier joueur de la partie à valider un tour ≥ 2 000 pts',
  },
  {
    id: 'premier-sang',
    name: 'Premier sang',
    emoji: '🏆',
    soundId: 'achievement',
    description: 'Provoquer la toute première collision de la partie',
  },
  {
    id: 'phenix',
    name: 'Phénix',
    emoji: '🏆',
    soundId: 'achievement',
    description:
      'Après une chute, remonter d’au moins 2 000 pts dès son tour suivant pour atteindre ou dépasser son score avant chute',
  },
  {
    id: 'remontada',
    name: 'Remontada',
    emoji: '🏆',
    soundId: 'achievement',
    description: 'Être seul dernier avant son tour et terminer son tour seul premier',
  },
  {
    id: 'miracule',
    name: 'Miraculé',
    emoji: '🏆',
    soundId: 'achievement',
    description: 'Valider un score positif alors qu’on avait 2 échecs consécutifs',
  },
  {
    id: 'bourreau',
    name: 'Bourreau',
    emoji: '🏆',
    soundId: 'achievement',
    description: 'Provoquer sur un même tour une collision faisant chuter au moins 2 adversaires',
  },
])

export const findAchievement = (id) =>
  ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null

export const evaluateAchievements = ({
  turnScore = 0,
  collisionsCount = 0,
  isFirstBloodOfGame = false,
  recoveredFromDrop = false,
  wasUniqueLastBeforeTurn = false,
  isUniqueFirstAfterTurn = false,
  failedTurnsBeforeTurn = 0,
  alreadyUnlockedIds = [],
  coupDeclatAlreadyAwarded = false,
} = {}) => {
  const unlocked = []
  const already = new Set(alreadyUnlockedIds)

  const check = (id, condition) => {
    if (condition && !already.has(id)) {
      unlocked.push(findAchievement(id))
    }
  }

  check('coup-declat', turnScore >= 2000 && !coupDeclatAlreadyAwarded)
  check('premier-sang', isFirstBloodOfGame === true)
  check('phenix', recoveredFromDrop === true)
  check('remontada', wasUniqueLastBeforeTurn === true && isUniqueFirstAfterTurn === true)
  check('miracule', failedTurnsBeforeTurn === 2 && turnScore > 0)
  check('bourreau', collisionsCount >= 2)

  return unlocked
}
