# AGENTS Guidelines

## Test coverage vigilance

- Treat test coverage as a hard quality gate before committing.
- Always run `npm run test:coverage` after changes affecting game logic.
- Eliminate uncovered lines in modified files whenever possible.
- Be especially vigilant on `src/game/PlayerState.js`, notably around checkpoint history and drop logic.
- Do not finalize a task if new logic is untested.
