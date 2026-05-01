import { describe, expect, it } from 'vitest'
import { GameEngine } from './GameEngine.js'

// Dispatch record_roll + keep en une seule étape
const roll = (engine, rolledDice, keptDice) => {
  engine.dispatch({ type: 'record_roll', rolledDice })
  return engine.dispatch({ type: 'keep', keptDice })
}

const snap = (engine) => engine.dispatch({ type: 'snapshot' })
const player = (engine, index) => snap(engine).players[index]

// Passe le tour du joueur courant sans scorer
const skipTurn = (engine) => {
  engine.dispatch({ type: 'start_turn' })
  engine.dispatch({ type: 'force_failure', reason: 'bust' })
}

describe('scénarios de parties', () => {
  it('ouverture bloquée puis réussie', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    engine.dispatch({ type: 'start_turn' })
    //          dés lancés          gardés         score cumulé  dés restants
    roll(engine, [1, 2, 3, 4, 6], [1])           // 100          4
    roll(engine, [5, 2, 3, 4],    [5])           // 50  → 150    3
    roll(engine, [5, 5, 2],       [5, 5])        // 100 → 250    1
    roll(engine, [5],             [5])           // 50  → 300    0 → hot dice (5 dés)

    // Score = 300 < 500 : arrêt impossible avant ouverture
    expect(() => engine.dispatch({ type: 'stop_turn' })).toThrow('Cannot open below 500')
    expect(snap(engine).stop.canStop).toBe(false)
    expect(snap(engine).stop.blockedReason).toBe('Ouverture impossible sous 500 points')

    // Continue et franchit le seuil d'ouverture
    roll(engine, [5, 5, 5, 2, 3], [5, 5, 5])    // 500 → 800    2 dés
    engine.dispatch({ type: 'stop_turn' })

    expect(player(engine, 0).score).toBe(800)
    expect(player(engine, 0).hasOpened).toBe(true)
    expect(snap(engine).currentPlayerIndex).toBe(1)
  })

  it('vol de position (steal) : le suivant hérite du score et des dés restants', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    // Alice garde 3 dés sur 5 → 2 dés restants transmis à Bob
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [5, 5, 5, 1, 2], [5, 5, 5])   // 500 pts, 2 dés restants
    engine.dispatch({ type: 'stop_turn' })       // lastValidatedTurn = {score:500, diceRemaining:2}

    expect(player(engine, 0).score).toBe(500)

    // Bob hérite: carriedScore=500, diceToRoll=2
    const bobTurnStart = engine.dispatch({ type: 'start_turn' })
    expect(bobTurnStart.canSteal).toBe(true)
    expect(bobTurnStart.turnScore).toBe(500)   // carriedScore transmis comme turnScore initial
    expect(bobTurnStart.diceToRoll).toBe(2)

    // Bob joue ses 2 dés volés → hot dice (tous scorants) → relance 5 dés
    roll(engine, [5, 5],          [5, 5])        // 100 → 600    0 → hot dice (5 dés)
    roll(engine, [5, 5, 5, 2, 3], [5, 5, 5])    // 500 → 1100   2 dés
    engine.dispatch({ type: 'stop_turn' })

    expect(player(engine, 1).score).toBe(1100)
    expect(snap(engine).currentPlayerIndex).toBe(0)
  })

  it('hot dice : garder tous les dés relance 5 dés sur le même tour', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    engine.dispatch({ type: 'start_turn' })

    // 1×1×1 = 1000, 5+5 = 100 → score 1100, tous les dés scorent → hot dice
    const firstKeep = roll(engine, [1, 1, 1, 5, 5], [1, 1, 1, 5, 5])
    expect(firstKeep.turnScore).toBe(1100)
    expect(firstKeep.diceToRoll).toBe(5)   // réinitialisé après hot dice

    roll(engine, [5, 5, 5, 2, 3], [5, 5, 5])   // 500 → 1600   2 dés
    engine.dispatch({ type: 'stop_turn' })

    expect(player(engine, 0).score).toBe(1600)
  })

  it('3 échecs consécutifs entraînent un retour au checkpoint précédent', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    // Alice atteint 1000 pts (nouveau checkpoint: historique [0, 1000])
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [1, 1, 1, 2, 3], [1, 1, 1])   // 1000 pts, 2 dés
    engine.dispatch({ type: 'stop_turn' })
    expect(player(engine, 0).score).toBe(1000)

    // 3 cycles Bob bust + Alice bust : Alice accumule 3 échecs d'affilée
    for (let i = 0; i < 3; i += 1) {
      skipTurn(engine) // Bob échoue
      skipTurn(engine) // Alice échoue (i+1/3)
    }

    // Après le 3ème échec d'Alice : retour au checkpoint précédent (0)
    expect(player(engine, 0).failedTurnsInRow).toBe(0)  // remis à zéro après drop
    expect(player(engine, 0).score).toBe(0)
  })

  it('collision : deux joueurs au même score → le collisionné recule', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    // Alice atteint 1000 (checkpoint: [0, 1000])
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [1, 1, 1, 2, 3], [1, 1, 1])   // 1000, 2 dés
    engine.dispatch({ type: 'stop_turn' })
    expect(player(engine, 0).score).toBe(1000)

    // Bob hérite mais échoue → lastValidatedTurn effacé
    engine.dispatch({ type: 'start_turn' })
    engine.dispatch({ type: 'force_failure', reason: 'bust' })

    // Alice passe son tour (lastValidatedTurn est null, pas de vol)
    skipTurn(engine)

    // Bob repart de zéro (pas de vol disponible)
    const bobStart = engine.dispatch({ type: 'start_turn' })
    expect(bobStart.canSteal).toBe(false)
    expect(bobStart.turnScore).toBe(0)

    // Bob atterrit sur 1000 → collision → Alice recule à son checkpoint précédent (0)
    roll(engine, [1, 1, 1, 2, 3], [1, 1, 1])   // 1000
    engine.dispatch({ type: 'stop_turn' })

    expect(player(engine, 1).score).toBe(1000)
    expect(player(engine, 0).score).toBe(0)     // Alice repoussée à 0
  })

  it('dépassement compte comme un échec, puis victoire par score exact', () => {
    // targetScore réduit pour un scénario de longueur raisonnable
    const engine = GameEngine.create(['Alice', 'Bob'], {
      targetScore: 2000,
      openingScore: 500,
    })

    // Alice tour 1 : +1000 → 1000
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [1, 1, 1, 2, 3], [1, 1, 1])
    engine.dispatch({ type: 'stop_turn' })
    expect(player(engine, 0).score).toBe(1000)

    skipTurn(engine) // Bob

    // Alice tour 2 : +500 → 1500
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [5, 5, 5, 2, 3], [5, 5, 5])
    engine.dispatch({ type: 'stop_turn' })
    expect(player(engine, 0).score).toBe(1500)

    skipTurn(engine) // Bob

    // Alice tente +1000 → 2500 > 2000 : overshoot = échec
    engine.dispatch({ type: 'start_turn' })
    roll(engine, [1, 1, 1, 2, 3], [1, 1, 1])   // turnScore=1000
    const overshoot = engine.dispatch({ type: 'stop_turn' })
    expect(overshoot.type).toBe('failure')
    expect(overshoot.reason).toBe('overshoot')
    expect(player(engine, 0).score).toBe(1500)  // score inchangé

    skipTurn(engine) // Bob

    // Alice vise exactement +500 → 2000 : victoire
    engine.dispatch({ type: 'start_turn' })
    // Vérification que stop est bloqué avant de garder des dés
    expect(snap(engine).stop.canStop).toBe(false)
    expect(snap(engine).stop.blockedReason).toBe('Aucun dé gardé sur ce tour')

    roll(engine, [5, 5, 5, 2, 3], [5, 5, 5])   // 500 → 1500+500=2000
    const winResult = engine.dispatch({ type: 'stop_turn' })

    expect(winResult.type).toBe('validated')
    expect(winResult.winner.name).toBe('Alice')
    expect(player(engine, 0).score).toBe(2000)
    expect(snap(engine).phase).toBe('gameOver')
    expect(snap(engine).winnerIndex).toBe(0)
  })
})
