import { TurnRules } from './TurnRules.js'

const turnRules = new TurnRules()

export function diceTurnScore(turn, modifiers = {}) {
  return turnRules.computeScore(turn.total, modifiers)
}

export function scoreDice(
  faces,
  { petiteSuite = false, eventId = null, magnetFace = null, magnetCount = 0 } = {}
) {
  if (
    !Array.isArray(faces) ||
    faces.length < 1 ||
    faces.length > 6 ||
    faces.some((face) => !Number.isInteger(face) || face < 1 || face > 6)
  )
    throw new Error('Un lancer contient de 1 à 6 faces entières entre 1 et 6.')

  if (
    (magnetFace !== null && ![1, 5].includes(magnetFace)) ||
    !Number.isInteger(magnetCount) ||
    magnetCount < 0 ||
    magnetCount + faces.filter((face) => face === magnetFace).length > 6
  )
    throw new Error('Regroupement Aimant invalide.')

  function valuePoints(face, count) {
    if (count >= 3)
      return (
        (face === 1 ? 1000 : face === 2 && eventId === 'fete-des-2' ? 2000 : face * 100) *
        2 ** (count - 3)
      )
    return (
      count *
      (face === 1 ? (eventId === 'tour-eclair' ? 200 : 100) : eventId === 'happy-hour' ? 100 : 50)
    )
  }

  function valueGroups(excluded = []) {
    const groups = []
    for (let face = 1; face <= 6; face++) {
      const indices = faces.flatMap((value, index) =>
        value === face && !excluded.includes(index) ? [index] : []
      )
      const count = indices.length
      const previous = face === magnetFace ? magnetCount : 0
      const combined = count + previous
      if (count > 0 && (combined >= 3 || face === 1 || face === 5)) {
        const name = { 3: 'Brelan', 4: 'Carré', 5: 'Quinte', 6: 'Six identiques' }[combined]
        groups.push({
          label:
            combined >= 3
              ? `${name} de ${face}${previous ? ' (Aimant)' : ''}`
              : `${count} × ${face}`,
          points: valuePoints(face, combined) - valuePoints(face, previous),
          indices,
          face,
        })
      }
    }
    return groups
  }
  const points = (groups) => groups.reduce((sum, group) => sum + group.points, 0)
  let groups = valueGroups()
  for (const size of petiteSuite ? [5, 4] : [5]) {
    for (let first = 1; first <= 7 - size; first++) {
      const indices = Array.from({ length: size }, (_, offset) => faces.indexOf(first + offset))
      if (indices.includes(-1)) continue
      const candidate = [
        {
          label: size === 5 ? 'Suite de cinq' : 'Petite Suite',
          points: size === 5 ? 1500 : 1000,
          indices,
        },
        ...valueGroups(indices),
      ]
      if (points(candidate) > points(groups)) groups = candidate
    }
  }
  return { points: points(groups), keptIndices: groups.flatMap((group) => group.indices), groups }
}

function emptyTurn(diceCount) {
  if (![5, 6].includes(diceCount)) throw new Error('Reprise de dés invalide.')
  return {
    diceCount,
    inheritedTotal: 0,
    magnetCounts: { 1: 0, 5: 0 },
    phase: 'ready',
    total: 0,
    lost: 0,
    dice: Array.from({ length: diceCount }, () => ({ face: null, kept: false })),
    rolls: [],
    inheritedRolls: [],
    actions: [{ type: 'start', diceCount }],
    lastRollIndices: [],
    lastResult: null,
  }
}

function adaptDice(turn, diceCount) {
  if (![5, 6].includes(diceCount)) throw new Error('Reprise de dés invalide.')
  if (turn.diceCount === diceCount) return turn.dice.map((die) => ({ ...die }))
  const kept = turn.dice.filter((die) => die.kept).slice(0, diceCount)
  const free = turn.dice.filter((die) => !die.kept)
  return Array.from({ length: diceCount }, (_, index) => ({
    ...(kept[index] ?? free[index - kept.length] ?? { face: null, kept: false }),
  }))
}

function inheritTurn(previous, total, diceCount, failedFaces = null) {
  if (previous.phase === 'bust' || !Number.isInteger(total) || total < 0 || total % 50 !== 0)
    throw new Error('Reprise de dés invalide.')
  const source = { ...previous }
  if (failedFaces) {
    const dice = previous.dice.every((die) => die.kept)
      ? emptyTurn(previous.diceCount).dice
      : previous.dice
    let index = 0
    source.dice = dice.map((die) => (die.kept ? die : { face: failedFaces[index++], kept: false }))
    if (index !== failedFaces.length || scoreDice(failedFaces).points !== 0)
      throw new Error('Reprise de broucouille invalide.')
  }
  return {
    ...previous,
    diceCount,
    dice: adaptDice(source, diceCount),
    phase: 'ready',
    total,
    lost: 0,
    inheritedTotal: total,
    rolls: [],
    inheritedRolls: [...previous.inheritedRolls, ...previous.rolls],
    lastRollIndices: [],
    lastResult: null,
    actions: [...previous.actions, { type: 'inherit', total, diceCount, failedFaces }],
  }
}

function replayActions(actions) {
  if (!Array.isArray(actions) || actions[0]?.type !== 'start')
    throw new Error('Tour de dés invalide.')
  return actions.slice(1).reduce((turn, action) => {
    if (action.type === 'roll') return rollDiceTurn(turn, action.faces, action)
    if (action.type === 'inherit')
      return inheritTurn(turn, action.total, action.diceCount, action.failedFaces)
    if (action.type === 'reset') return resetDiceTurn(turn)
    if (action.type === 'capacity') return setDiceCapacity(turn, action.diceCount)
    throw new Error('Action de dés invalide.')
  }, emptyTurn(actions[0].diceCount))
}

export function newDiceTurn(carry = [], diceCount = carry?.diceCount ?? 5) {
  const inheritedRolls = Array.isArray(carry) ? carry : carry?.rolls
  const inheritedTotal = Array.isArray(carry) ? undefined : carry?.total
  if (!Array.isArray(inheritedRolls)) throw new Error('Reprise de dés invalide.')
  const initial = emptyTurn(Array.isArray(carry) ? diceCount : (carry.diceCount ?? diceCount))
  if (inheritedRolls.length === 0 && !carry.actions) {
    if (inheritedTotal !== undefined && inheritedTotal !== 0)
      throw new Error('Reprise de dés invalide.')
    return emptyTurn(diceCount)
  }
  const previous = carry.actions
    ? replayActions(carry.actions)
    : inheritedRolls.reduce((turn, faces) => rollDiceTurn(turn, faces), initial)
  const total = inheritedTotal ?? previous.total
  if (!carry.fromBust && (total === 0 || total % 100 !== 0))
    throw new Error('Reprise de dés invalide.')
  return inheritTurn(previous, total, diceCount, carry.failedFaces)
}

export function diceToRoll(turn) {
  return turn.dice.filter((die) => !die.kept).length || turn.diceCount
}

export function rollDiceTurn(
  turn,
  faces,
  { petiteSuite = false, eventId = null, magnetFace = null } = {}
) {
  if (turn.phase === 'bust') throw new Error('Ce tour est terminé.')
  if (faces.length !== diceToRoll(turn)) throw new Error('Relancez uniquement les dés libres.')
  const full = turn.dice.every((die) => die.kept)
  const magnetCounts = full ? { 1: 0, 5: 0 } : turn.magnetCounts
  const result = scoreDice(faces, {
    petiteSuite,
    eventId,
    magnetFace,
    magnetCount: magnetFace === null ? 0 : magnetCounts[magnetFace],
  })
  const dice = full ? emptyTurn(turn.diceCount).dice : turn.dice
  const lastRollIndices = []
  let index = 0
  const nextDice = dice.map((die, position) => {
    if (die.kept) return { ...die }
    lastRollIndices.push(position)
    return { face: faces[index], kept: result.keptIndices.includes(index++) }
  })
  const bust = result.points === 0
  return {
    ...turn,
    phase: bust ? 'bust' : 'playing',
    magnetCounts: Object.fromEntries(
      [1, 5].map((face) => [
        face,
        magnetCounts[face] +
          result.groups
            .filter((group) => group.face === face)
            .reduce((count, group) => count + group.indices.length, 0),
      ])
    ),
    total: bust ? 0 : turn.total + result.points,
    lost: bust ? turn.total : 0,
    dice: nextDice,
    rolls: [...turn.rolls, [...faces]],
    actions: [
      ...turn.actions,
      { type: 'roll', faces: [...faces], petiteSuite, eventId, magnetFace },
    ],
    lastRollIndices,
    lastResult: result,
  }
}

export function setDiceCapacity(turn, diceCount) {
  if (turn.phase !== 'ready' || turn.rolls.length > 0)
    throw new Error('Annoncez cette carte avant le premier lancer.')
  return {
    ...turn,
    diceCount,
    dice: adaptDice(turn, diceCount),
    actions: [...turn.actions, { type: 'capacity', diceCount }],
  }
}

export function resetDiceTurn(turn) {
  if (turn.phase !== 'playing') throw new Error('Reset exige un tour entre deux lancers réussis.')
  return {
    ...turn,
    dice: emptyTurn(turn.diceCount).dice,
    magnetCounts: { 1: 0, 5: 0 },
    lastRollIndices: [],
    lastResult: null,
    actions: [...turn.actions, { type: 'reset' }],
  }
}

export function retryDiceTurn(turn) {
  if (turn.phase !== 'bust') throw new Error('La Seconde Chance exige une broucouille.')
  return replayActions(turn.actions.slice(0, -1))
}

export function changeLastDiceRoll(turn, cardId, { dieIndex, face } = {}) {
  const action = turn.actions.at(-1)
  if (action.type !== 'roll') throw new Error('Cette carte exige un dernier lancer visible.')
  const next = { ...action, faces: [...action.faces] }
  if (cardId === 'petite-suite') {
    if (
      ![1, 2, 3].some((first) =>
        [0, 1, 2, 3].every((offset) => action.faces.includes(first + offset))
      )
    ) {
      throw new Error('Le dernier lancer ne contient pas de suite de quatre.')
    }
    next.petiteSuite = true
  } else {
    const localIndex = turn.lastRollIndices.indexOf(dieIndex)
    if (localIndex === -1)
      throw new Error('Choisissez un dé du dernier lancer, pas une ancienne réserve.')
    if (cardId === 'convertisseur') {
      if (
        turn.lastResult.keptIndices.includes(localIndex) ||
        ![2, 3, 4, 6].includes(action.faces[localIndex])
      )
        throw new Error('Le Convertisseur exige un dé non marquant.')
      face = 5
    }
    if (!Number.isInteger(face) || face < 1 || face > 6)
      throw new Error('Choisissez une face de 1 à 6.')
    next.faces[localIndex] = face
  }
  // Rejouer remplace le gain entier du dernier lancer, jamais les anciennes réserves.
  return replayActions([...turn.actions.slice(0, -1), next])
}

export function diceStopReason(turn, player, openingScore = 500, modifiers = {}) {
  if (turn.phase === 'ready') return 'Lancez les dés pour commencer.'
  if (turn.phase === 'bust') return 'Broucouille : ce tour est terminé.'
  const reasons = []
  const score = diceTurnScore(turn, modifiers)
  if (turn.total % 100 !== 0 && !modifiers.arrondi)
    reasons.push('Le cumul doit être un multiple de 100.')
  if (!player.hasOpened && score < openingScore)
    reasons.push(
      `Ouverture : encore ${openingScore - score} points pour atteindre ${openingScore}.`
    )
  return reasons.join(' ')
}

export function restoreDiceTurn(saved) {
  if (!saved || !Array.isArray(saved.rolls)) throw new Error('Tour de dés invalide.')
  if (saved.actions) return replayActions(saved.actions)
  return saved.rolls.reduce(
    (turn, faces) => rollDiceTurn(turn, faces),
    newDiceTurn({
      rolls: saved.inheritedRolls ?? [],
      total: saved.inheritedTotal,
      diceCount: saved.diceCount ?? 5,
    })
  )
}
