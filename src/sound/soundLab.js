import { findSound, SOUND_CATEGORIES, SOUNDS } from './sounds.js'
import { createEngine, voice } from './synth.js'

export const RATINGS_KEY = 'centmille-sound-ratings'

export const VERDICTS = [
  { id: 'keep', label: '👍 Garder' },
  { id: 'rework', label: '🔧 À retravailler' },
  { id: 'drop', label: '👎 Jeter' },
]

const defaultCreateContext = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  return AudioCtx ? new AudioCtx() : null
}

export const loadRatings = (storage) => {
  try {
    return JSON.parse(storage.getItem(RATINGS_KEY)) ?? {}
  } catch {
    return {}
  }
}

export const formatRatings = (ratings) =>
  SOUNDS.map((sound) => {
    const rating = ratings[sound.id] ?? {}
    const verdict = VERDICTS.find((item) => item.id === rating.verdict)?.label ?? '— pas noté'
    const comment = rating.comment ? ` : ${rating.comment}` : ''
    return `- ${sound.label} (${sound.id}) → ${verdict}${comment}`
  }).join('\n')

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag)
  Object.assign(node, props)
  for (const child of children) node.append(child)
  return node
}

export const mountSoundLab = (
  root,
  { storage = window.localStorage, createContext = defaultCreateContext } = {}
) => {
  let engine = null
  let volume = 0.8
  const ratings = loadRatings(storage)

  const save = () => storage.setItem(RATINGS_KEY, JSON.stringify(ratings))

  const play = (id) => {
    const sound = findSound(id)
    if (!sound) return false
    if (!engine) {
      const ctx = createContext()
      if (!ctx) return false
      engine = createEngine(ctx, { volume })
    }
    engine.ctx.resume?.()
    sound.play(voice(engine))
    return true
  }

  const renderSound = (sound) => {
    const rating = ratings[sound.id] ?? {}
    const playButton = el('button', { className: 'play', textContent: '▶', title: 'Écouter' })
    playButton.dataset.testid = `play-${sound.id}`
    playButton.addEventListener('click', () => play(sound.id))

    const verdictButtons = VERDICTS.map((verdict) => {
      const button = el('button', { className: 'verdict', textContent: verdict.label })
      button.dataset.testid = `verdict-${sound.id}-${verdict.id}`
      button.classList.toggle('selected', rating.verdict === verdict.id)
      button.addEventListener('click', () => {
        ratings[sound.id] = { ...ratings[sound.id], verdict: verdict.id }
        save()
        for (const other of verdictButtons) other.classList.toggle('selected', other === button)
      })
      return button
    })

    const comment = el('input', {
      className: 'comment',
      placeholder: 'Commentaire…',
      value: rating.comment ?? '',
    })
    comment.dataset.testid = `comment-${sound.id}`
    comment.addEventListener('input', () => {
      ratings[sound.id] = { ...ratings[sound.id], comment: comment.value }
      save()
    })

    return el('li', { className: 'sound' }, [
      playButton,
      el('div', { className: 'info' }, [
        el('strong', { textContent: sound.label }),
        el('small', { textContent: sound.intent }),
      ]),
      el('div', { className: 'verdicts' }, verdictButtons),
      comment,
    ])
  }

  const volumeInput = el('input', {
    type: 'range',
    min: '0',
    max: '1',
    step: '0.05',
    value: String(volume),
  })
  volumeInput.dataset.testid = 'volume'
  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value)
    if (engine) engine.master.gain.value = volume
  })

  const exportArea = el('textarea', { className: 'export', readOnly: true, rows: 8 })
  exportArea.dataset.testid = 'export'
  const exportButton = el('button', {
    className: 'export-button',
    textContent: '📋 Générer mes verdicts',
  })
  exportButton.dataset.testid = 'export-button'
  exportButton.addEventListener('click', () => {
    exportArea.value = formatRatings(ratings)
    exportArea.select()
    navigator.clipboard?.writeText(exportArea.value).catch(() => {})
  })

  root.replaceChildren(
    el('h1', { textContent: '🎵 Labo des sons du Cent Mille' }),
    el('p', {
      textContent:
        'Écoute chaque son, donne un verdict et un commentaire. Les notes sont gardées dans ce navigateur. À la fin, génère le récap et colle-le dans la conversation.',
    }),
    el('label', { className: 'volume' }, ['🔊 Volume ', volumeInput]),
    ...SOUND_CATEGORIES.map((category) =>
      el('section', {}, [
        el('h2', { textContent: category.label }),
        el('ul', {}, SOUNDS.filter((sound) => sound.category === category.id).map(renderSound)),
      ])
    ),
    el('section', {}, [exportButton, exportArea])
  )

  return { play }
}
