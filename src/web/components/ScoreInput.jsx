export const ScoreInput = () => {
  return (
    <section>
      <label htmlFor="turn-score">Score du tour</label>
      <input id="turn-score" name="turnScore" inputMode="numeric" />
      <div>
        <button type="button">Valider</button>
        <button type="button">Bust</button>
        <button type="button">Annuler</button>
      </div>
    </section>
  )
}
