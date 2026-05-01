import { DiceScorer } from '../rules/DiceScorer.js'

const defaultScorer = new DiceScorer()

export const selectAutoKeptDice = (rolledDice, scorer = defaultScorer) => {
  return scorer.getScoringDice(rolledDice)
}
