import { bell, brass, noise, note, pluck, tone } from './synth.js'

// Catalogue des sons du jeu. Chaque entrée : id, catégorie, libellé, intention, fonction de rendu.

const randomBetween = (min, max) => min + Math.random() * (max - min)

const common = (v) => {
  pluck(v, { freq: note('C5'), at: 0 })
  pluck(v, { freq: note('E5'), at: 0.07 })
  pluck(v, { freq: note('G5'), at: 0.14 })
  bell(v, { freq: note('C6'), at: 0.21, gain: 0.08, dur: 1.2 })
}

const rare = (v) => {
  brass(v, { freq: note('G4'), at: 0, dur: 0.14 })
  brass(v, { freq: note('C5'), at: 0.15, dur: 0.14 })
  brass(v, { freq: note('E5'), at: 0.3, dur: 0.14 })
  brass(v, { freq: note('G5'), at: 0.45, dur: 0.8 })
  brass(v, { freq: note('C4'), at: 0.45, dur: 0.8, gain: 0.08 })
  bell(v, { freq: note('G6'), at: 0.45, gain: 0.07 })
  noise(v, { at: 0.45, dur: 0.6, gain: 0.04, filter: { type: 'highpass', freq: 7000 } })
}

const legendary = (v) => {
  noise(v, { at: 0, dur: 0.45, attack: 0.4, gain: 0.08, filter: { type: 'highpass', freq: 5000 } })
  for (const at of [0, 0.12, 0.24]) brass(v, { freq: note('C5'), at, dur: 0.1 })
  for (const name of ['C4', 'C5', 'E5', 'G5', 'C6']) {
    brass(v, { freq: note(name), at: 0.4, dur: 1.5, gain: 0.08 })
  }
  noise(v, { at: 0.4, dur: 1.8, gain: 0.12, wet: 0.5, filter: { type: 'highpass', freq: 6000 } })
  ;['C6', 'E6', 'G6', 'C7', 'E7'].forEach((name, i) => {
    bell(v, { freq: note(name), at: 0.5 + i * 0.09, gain: 0.06, wet: 0.6 })
  })
}

const cardFlip = (v) => {
  noise(v, {
    dur: 0.18,
    gain: 0.25,
    filter: { type: 'bandpass', freq: 800, endFreq: 4500, q: 1.2 },
  })
  noise(v, { at: 0.17, dur: 0.03, gain: 0.3, filter: { type: 'highpass', freq: 2000 } })
}

const mirror = (v) => {
  tone(v, { freq: 1200, endFreq: 4200, dur: 0.35, gain: 0.06, wet: 0.6 })
  noise(v, { at: 0.3, dur: 0.7, gain: 0.08, wet: 0.6, filter: { type: 'highpass', freq: 8000 } })
  ;['E6', 'B6', 'E7', 'G#7'].forEach((name, i) => {
    bell(v, { freq: note(name), at: 0.3 + i * 0.08, gain: 0.07, wet: 0.8, dur: 2 })
  })
}

const freeze = (v) => {
  tone(v, {
    freq: 3200,
    endFreq: 260,
    dur: 1,
    gain: 0.08,
    wet: 0.5,
    vibrato: { rate: 9, depth: 40 },
  })
  for (let i = 0; i < 10; i++) {
    noise(v, {
      at: 0.6 + randomBetween(0, 0.8),
      dur: 0.04,
      gain: randomBetween(0.1, 0.25),
      filter: { type: 'highpass', freq: 5000 },
    })
  }
  bell(v, { freq: note('B3'), at: 0.9, gain: 0.1, wet: 0.7, dur: 2.2 })
}

const bomb = (v) => {
  noise(v, { dur: 1.4, gain: 0.06, attack: 0.1, filter: { type: 'bandpass', freq: 3500, q: 2 } })
  for (let at = 0; at < 1.4; at += 0.045) {
    noise(v, {
      at,
      dur: 0.03,
      gain: randomBetween(0.03, 0.14),
      filter: { type: 'highpass', freq: 4000 },
    })
  }
  tone(v, { freq: 130, endFreq: 28, at: 1.5, dur: 1.3, gain: 0.9 })
  tone(v, { freq: 70, endFreq: 35, type: 'square', at: 1.5, dur: 0.3, gain: 0.15 })
  noise(v, {
    at: 1.5,
    dur: 1.6,
    gain: 0.7,
    wet: 0.3,
    filter: { type: 'lowpass', freq: 1800, endFreq: 90 },
  })
}

const sniper = (v) => {
  noise(v, { dur: 0.02, gain: 0.4, filter: { type: 'highpass', freq: 3000 } })
  ;[0, 0.18, 0.36].forEach((at, i) => {
    tone(v, { freq: 2200, endFreq: 180, type: 'square', at, dur: 0.25, gain: 0.12 / 2 ** i })
  })
}

const pandora = (v) => {
  for (const name of ['A3', 'C4', 'E4']) {
    tone(v, {
      freq: note(name),
      dur: 1.6,
      attack: 0.8,
      gain: 0.07,
      wet: 0.7,
      vibrato: { rate: 5, depth: 3 },
    })
  }
  tone(v, { freq: note('G#4'), dur: 1.6, attack: 1, gain: 0.03, wet: 0.8 })
  noise(v, {
    at: 1.3,
    dur: 0.4,
    gain: 0.15,
    filter: { type: 'bandpass', freq: 600, endFreq: 6000 },
  })
  bell(v, { freq: note('D#5'), at: 1.6, gain: 0.1, wet: 0.8, dur: 2 })
  bell(v, { freq: note('A5'), at: 1.6, gain: 0.08, wet: 0.8, dur: 2 })
}

const magicNumber = (v) => {
  ;['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'].forEach((name, i) => {
    pluck(v, { freq: note(name), at: i * 0.045, gain: 0.12, wet: 0.5 })
  })
  bell(v, { freq: note('C7'), at: 0.45, gain: 0.08, wet: 0.7, dur: 2 })
}

const devil = (v) => {
  const organ = (name, at, dur) =>
    tone(v, {
      freq: note(name),
      type: 'square',
      at,
      dur,
      gain: 0.07,
      attack: 0.02,
      wet: 0.6,
      filter: { type: 'lowpass', freq: 1400 },
    })
  for (const at of [0, 0.35]) {
    organ('A2', at, 0.28)
    organ('D#3', at, 0.28)
  }
  for (const name of ['A1', 'A2', 'D#3', 'C4']) organ(name, 0.7, 1.8)
  noise(v, { at: 0.7, dur: 1.8, gain: 0.15, filter: { type: 'lowpass', freq: 150 } })
}

const jackpot = (v) => {
  for (let i = 0; i < 10; i++) {
    bell(v, { freq: note(i % 2 ? 'G6' : 'E6'), at: i * 0.06, gain: 0.05, dur: 0.4, wet: 0.2 })
  }
  for (let i = 0; i < 12; i++) {
    bell(v, {
      freq: randomBetween(2000, 3200),
      at: 0.65 + i * 0.05,
      gain: 0.04,
      dur: 0.3,
      wet: 0.3,
    })
  }
  for (const name of ['C5', 'E5', 'G5', 'C6'])
    brass(v, { freq: note(name), at: 0.65, dur: 1, gain: 0.07 })
}

const tierCrossed = (v) => {
  ;['C5', 'E5', 'G5', 'C6'].forEach((name, i) => {
    pluck(v, { freq: note(name), at: i * 0.05, gain: 0.12 })
  })
  for (const name of ['C5', 'G5', 'C6'])
    brass(v, { freq: note(name), at: 0.22, dur: 0.9, gain: 0.07 })
}

const redZone = (v) => {
  for (let i = 0; i < 6; i++) {
    tone(v, {
      freq: i % 2 ? 660 : 880,
      type: 'sawtooth',
      at: i * 0.28,
      dur: 0.27,
      gain: 0.08,
      attack: 0.02,
      filter: { type: 'lowpass', freq: 2500 },
    })
  }
  for (let i = 0; i < 3; i++) tone(v, { freq: 55, at: i * 0.56, dur: 0.4, gain: 0.35 })
}

const victory = (v) => {
  const melody = [
    ['G4', 0, 0.14],
    ['C5', 0.15, 0.14],
    ['E5', 0.3, 0.14],
    ['G5', 0.45, 0.28],
    ['E5', 0.75, 0.14],
    ['G5', 0.9, 1.4],
  ]
  for (const [name, at, dur] of melody) brass(v, { freq: note(name), at, dur })
  for (const name of ['C3', 'C4', 'E4', 'G4'])
    brass(v, { freq: note(name), at: 0.9, dur: 1.4, gain: 0.06 })
  noise(v, { at: 0.9, dur: 2, gain: 0.12, wet: 0.5, filter: { type: 'highpass', freq: 6000 } })
  ;['G6', 'C7', 'E7', 'G7'].forEach((name, i) => {
    bell(v, { freq: note(name), at: 1 + i * 0.1, gain: 0.05, wet: 0.7 })
  })
}

const achievement = (v) => {
  bell(v, { freq: note('E6'), gain: 0.1 })
  bell(v, { freq: note('B6'), at: 0.12, gain: 0.1 })
  for (const name of ['E5', 'G#5', 'B5']) {
    tone(v, { freq: note(name), at: 0.12, dur: 1.2, attack: 0.2, gain: 0.05, wet: 0.6 })
  }
}

const curse = (v) => {
  tone(v, {
    freq: 600,
    dur: 2,
    attack: 0.3,
    gain: 0.1,
    wet: 0.7,
    vibrato: { rate: 6, depth: 14 },
    path: [
      [0.5, 400],
      [1, 720],
      [1.6, 330],
    ],
  })
  tone(v, { freq: note('D2'), dur: 2, attack: 0.5, gain: 0.12, type: 'triangle' })
}

const duel = (v) => {
  for (const at of [0, 0.35]) {
    noise(v, { at, dur: 0.08, gain: 0.3, filter: { type: 'bandpass', freq: 3000, q: 3 } })
    for (const freq of [1530, 2370, 3310]) tone(v, { freq, at, dur: 0.6, gain: 0.04, wet: 0.4 })
  }
}

const gong = (v) => {
  noise(v, { dur: 0.15, gain: 0.2, filter: { type: 'lowpass', freq: 800 } })
  bell(v, { freq: 98, dur: 4, gain: 0.25, wet: 0.6 })
  tone(v, {
    freq: 98 * 1.5,
    dur: 3,
    attack: 0.4,
    gain: 0.04,
    wet: 0.6,
    vibrato: { rate: 3, depth: 2 },
  })
}

const consolation = (v) => {
  ;['G5', 'E5', 'C5'].forEach((name, i) => {
    pluck(v, { freq: note(name), at: i * 0.18, gain: 0.1, wet: 0.4 })
  })
  for (const name of ['F4', 'A4', 'C5']) {
    tone(v, { freq: note(name), at: 0.55, dur: 1.4, attack: 0.25, gain: 0.05, wet: 0.6 })
  }
}

const crown = (v) => {
  brass(v, { freq: note('D5'), dur: 0.12 })
  brass(v, { freq: note('D5'), at: 0.13, dur: 0.12 })
  brass(v, { freq: note('A5'), at: 0.26, dur: 0.6 })
  brass(v, { freq: note('D6'), at: 0.26, dur: 0.6, gain: 0.06 })
  bell(v, { freq: note('A6'), at: 0.26, gain: 0.06, wet: 0.6 })
}

const shop = (v) => {
  noise(v, { dur: 0.05, gain: 0.3, filter: { type: 'bandpass', freq: 1500, q: 2 } })
  noise(v, { at: 0.08, dur: 0.05, gain: 0.3, filter: { type: 'bandpass', freq: 1200, q: 2 } })
  bell(v, { freq: note('C7'), at: 0.18, gain: 0.08, dur: 1 })
  bell(v, { freq: note('E7'), at: 0.18, gain: 0.06, dur: 1 })
}

// Reprise fidèle du son de rétrogradation existant, pour comparaison.
const downgrade = (v) => {
  const steps = [
    { freqs: [146.83, 293.66], at: 0, dur: 0.16, ratio: 1 },
    { freqs: [138.59, 277.18], at: 0.19, dur: 0.16, ratio: 1 },
    { freqs: [65.41, 130.81, 196.0, 261.63], at: 0.38, dur: 0.9, ratio: 0.92 },
  ]
  for (const { freqs, at, dur, ratio } of steps) {
    for (const freq of freqs) {
      tone(v, { freq, endFreq: freq * ratio, type: 'sawtooth', at, dur, gain: 0.22, attack: 0.001 })
    }
  }
}

export const SOUND_CATEGORIES = [
  { id: 'rarity', label: 'Tirage de carte (par rareté)' },
  { id: 'card', label: 'Sons signatures de cartes' },
  { id: 'game', label: 'Moments de partie' },
]

export const SOUNDS = [
  {
    id: 'card-flip',
    category: 'rarity',
    label: 'Retournement de carte',
    intent: 'Bruit de papier joué avant chaque révélation',
    play: cardFlip,
  },
  {
    id: 'rarity-common',
    category: 'rarity',
    label: 'Commune ⚪',
    intent: 'Petit arpège pincé, discret',
    play: common,
  },
  {
    id: 'rarity-rare',
    category: 'rarity',
    label: 'Rare 🔵',
    intent: 'Fanfare de cuivres courte',
    play: rare,
  },
  {
    id: 'rarity-legendary',
    category: 'rarity',
    label: 'Légendaire 🟡',
    intent: 'Roulement, accord triomphal, pluie de clochettes',
    play: legendary,
  },
  {
    id: 'mirror',
    category: 'card',
    label: 'Miroir 🪞',
    intent: 'Cristal qui renvoie',
    play: mirror,
  },
  {
    id: 'freeze',
    category: 'card',
    label: 'Gel 🧊',
    intent: 'Glissando descendant et craquements de glace',
    play: freeze,
  },
  {
    id: 'bomb',
    category: 'card',
    label: 'Bombe 💣',
    intent: 'Mèche qui grésille puis explosion',
    play: bomb,
  },
  { id: 'sniper', category: 'card', label: 'Sniper 🎯', intent: '« Pew » avec écho', play: sniper },
  {
    id: 'pandora',
    category: 'card',
    label: 'Boîte de Pandore 📦',
    intent: 'Accord mystérieux qui monte, résolution ambiguë',
    play: pandora,
  },
  {
    id: 'curse',
    category: 'card',
    label: 'Malédiction 🧿',
    intent: 'Thérémine de film d’horreur',
    play: curse,
  },
  { id: 'duel', category: 'card', label: 'Duel ⚔️', intent: 'Deux chocs d’épées', play: duel },
  {
    id: 'magic-number',
    category: 'game',
    label: 'Nombre magique 🔮',
    intent: 'Glissando de harpe',
    play: magicNumber,
  },
  {
    id: 'devil',
    category: 'game',
    label: 'Le Diable 66 600 😈',
    intent: 'Orgue lugubre (triton)',
    play: devil,
  },
  {
    id: 'jackpot',
    category: 'game',
    label: 'Jackpot 77 700 🎰',
    intent: 'Machine à sous et pluie de pièces',
    play: jackpot,
  },
  {
    id: 'tier-crossed',
    category: 'game',
    label: 'Palier franchi',
    intent: 'Montée rapide et accord',
    play: tierCrossed,
  },
  {
    id: 'achievement',
    category: 'game',
    label: 'Succès 🏆',
    intent: 'Ding-ding et nappe',
    play: achievement,
  },
  {
    id: 'consolation',
    category: 'game',
    label: 'Consolation 🩹',
    intent: 'Descente douce puis accord réconfortant',
    play: consolation,
  },
  {
    id: 'crown',
    category: 'game',
    label: 'Couronne / Prime 👑',
    intent: 'Appel de trompette royal',
    play: crown,
  },
  {
    id: 'table-event',
    category: 'game',
    label: 'Événement de table 🌍',
    intent: 'Gong',
    play: gong,
  },
  {
    id: 'shop',
    category: 'game',
    label: 'Boutique 🛒',
    intent: 'Tiroir-caisse « ka-ching »',
    play: shop,
  },
  {
    id: 'red-zone',
    category: 'game',
    label: 'Zone rouge 🚨',
    intent: 'Sirène d’alarme',
    play: redZone,
  },
  {
    id: 'victory',
    category: 'game',
    label: 'Victoire',
    intent: 'Fanfare « ta-da » complète',
    play: victory,
  },
  {
    id: 'downgrade',
    category: 'game',
    label: 'Rétrogradation (actuel)',
    intent: 'Son existant, pour référence',
    play: downgrade,
  },
]

export const findSound = (id) => SOUNDS.find((sound) => sound.id === id) ?? null
