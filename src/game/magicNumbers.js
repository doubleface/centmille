const LUCKY_REPDIGITS = new Set([11100, 22200, 33300, 44400, 55500, 88800, 99900])
const ASCENDING_SEQUENCES = new Set([12300, 23400, 34500, 45600, 56700, 67800, 78900])
const EXACT_TIERS = new Set([20000, 40000, 60000, 80000])
const ANSWER_42_SCORES = new Set([24000, 42000, 42400, 84000])
const BLACK_CAT_SCORES = new Set([13000, 31300, 51300, 71300, 91300])

export const MAGIC_NUMBERS = Object.freeze([
  {
    id: 'lucky-repdigit',
    name: '🍀 Porte-bonheur',
    emoji: '🍀',
    soundId: 'magic-number',
    description: 'Pioche 1 carte aléatoire (probabilités normales)',
    matches: (score) => LUCKY_REPDIGITS.has(score),
  },
  {
    id: 'ascending',
    name: '📈 La Suite',
    emoji: '📈',
    soundId: 'magic-number',
    description: '+1 000 pts immédiats (sauf si dépasse 100 000)',
    matches: (score) => ASCENDING_SEQUENCES.has(score),
  },
  {
    id: 'exact-tier',
    name: '🎯 Pile poil',
    emoji: '🎯',
    soundId: 'magic-number',
    description: 'Reçoit la carte bouclier gratuitement',
    matches: (score) => EXACT_TIERS.has(score),
  },
  {
    id: 'devil',
    name: '😈 Le Diable',
    emoji: '😈',
    soundId: 'devil',
    description: 'Chute d’un palier immédiatement (peut être bloqué par Bouclier / Parachute)',
    matches: (score) => score === 66600,
  },
  {
    id: 'answer-42',
    name: '🌌 La Grande Réponse',
    emoji: '🌌',
    soundId: 'magic-number',
    description: 'Tire 2 cartes, le joueur en choisit 1 à garder',
    matches: (score) => ANSWER_42_SCORES.has(score),
  },
  {
    id: 'black-cat',
    name: '🐈‍⬛ Le Chat noir',
    emoji: '🐈‍⬛',
    soundId: 'curse',
    description: 'Applique le statut malédiction (doit faire ≥ 500 au prochain tour sinon échec)',
    matches: (score) => BLACK_CAT_SCORES.has(score),
  },
  {
    id: 'jackpot',
    name: '🎰 Jackpot',
    emoji: '🎰',
    soundId: 'jackpot',
    description: 'Pioche 1 carte Légendaire',
    matches: (score) => score === 77700,
  },
])

export const checkMagicNumber = (score) => {
  return MAGIC_NUMBERS.find((magic) => magic.matches(score)) ?? null
}
