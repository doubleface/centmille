export function scoreDice(faces) {
  if (
    !Array.isArray(faces) ||
    faces.length < 1 ||
    faces.length > 5 ||
    faces.some((face) => !Number.isInteger(face) || face < 1 || face > 6)
  ) {
    throw new Error('Un lancer contient de 1 à 5 faces entières entre 1 et 6.')
  }
  const groups = []
  const sorted = [...faces].sort().join('')
  if (sorted === '12345' || sorted === '23456') {
    groups.push({ label: 'Suite de cinq', points: 1500, indices: faces.map((_, index) => index) })
  } else {
    for (let face = 1; face <= 6; face++) {
      const indices = faces.flatMap((value, index) => (value === face ? [index] : []))
      const count = indices.length
      if (count >= 3) {
        const name = { 3: 'Brelan', 4: 'Carré', 5: 'Quinte' }[count]
        groups.push({
          label: `${name} de ${face}`,
          points: (face === 1 ? 1000 : face * 100) * 2 ** (count - 3),
          indices,
        })
      } else if (count > 0 && (face === 1 || face === 5)) {
        groups.push({
          label: `${count} × ${face}`,
          points: count * (face === 1 ? 100 : 50),
          indices,
        })
      }
    }
  }
  return {
    points: groups.reduce((sum, group) => sum + group.points, 0),
    keptIndices: groups.flatMap((group) => group.indices),
    groups,
  }
}

export function newDiceTurn(inheritedRolls = []) {
  if (!Array.isArray(inheritedRolls)) throw new Error('Reprise de dés invalide.')
  const initial = {
    phase: 'ready',
    total: 0,
    lost: 0,
    dice: Array.from({ length: 5 }, () => ({ face: null, kept: false })),
    rolls: [],
    inheritedRolls: [],
  }
  if (inheritedRolls.length === 0) return initial
  const previous = inheritedRolls.reduce((turn, faces) => rollDiceTurn(turn, faces), initial)
  if (previous.phase === 'bust' || previous.total % 100 !== 0) {
    throw new Error('Reprise de dés invalide.')
  }
  // Le cumul repris compte, mais aucun lancer du nouveau joueur n’a encore eu lieu.
  return { ...previous, phase: 'ready', rolls: [], inheritedRolls: previous.rolls }
}

export function diceToRoll(turn) {
  return turn.dice.filter((die) => !die.kept).length || 5
}

export function rollDiceTurn(turn, faces) {
  if (turn.phase === 'bust') throw new Error('Ce tour est terminé.')
  if (faces.length !== diceToRoll(turn)) throw new Error('Relancez uniquement les dés libres.')
  const result = scoreDice(faces)
  const dice = turn.dice.every((die) => die.kept) ? newDiceTurn().dice : turn.dice
  let index = 0
  const nextDice = dice.map((die) => {
    if (die.kept) return { ...die }
    const next = { face: faces[index], kept: result.keptIndices.includes(index) }
    index++
    return next
  })
  const bust = result.points === 0
  return {
    ...turn,
    phase: bust ? 'bust' : 'playing',
    total: bust ? 0 : turn.total + result.points,
    lost: bust ? turn.total : 0,
    dice: nextDice,
    rolls: [...turn.rolls, [...faces]],
  }
}

export function diceStopReason(turn, player, openingScore = 500) {
  if (turn.phase === 'ready') return 'Lancez les dés pour commencer.'
  if (turn.phase === 'bust') return 'Broucouille : ce tour est terminé.'
  const reasons = []
  if (turn.total % 100 !== 0) reasons.push('Le cumul doit être un multiple de 100.')
  if (!player.hasOpened && turn.total < openingScore) {
    reasons.push(
      `Ouverture : encore ${openingScore - turn.total} points pour atteindre ${openingScore}.`
    )
  }
  return reasons.join(' ')
}

export function restoreDiceTurn(saved) {
  if (!saved || !Array.isArray(saved.rolls)) throw new Error('Tour de dés invalide.')
  return saved.rolls.reduce(
    (turn, faces) => rollDiceTurn(turn, faces),
    newDiceTurn(saved.inheritedRolls)
  )
}
