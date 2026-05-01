export const rollDice = (count, rng = Math.random) => {
  return Array.from({ length: count }, () => Math.floor(rng() * 6) + 1)
}
