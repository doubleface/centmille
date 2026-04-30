# Save file format

The CLI save file uses a JSON object with two top-level keys:

- `metadata`
- `snapshot`

## Shape

```json
{
  "metadata": {
    "formatVersion": 1,
    "game": "centmille",
    "savedAt": "2026-05-01T00:00:00.000Z",
    "source": "cli"
  },
  "snapshot": {
    "targetScore": 10000,
    "diceCount": 5,
    "openingScore": 500,
    "currentPlayerIndex": 0,
    "players": [
      {
        "name": "Alice",
        "score": 0,
        "previousCheckpointScore": 0,
        "checkpointHistory": [0],
        "hasOpened": false,
        "failedTurnsInRow": 0
      }
    ],
    "lastValidatedTurn": null,
    "activeTurn": null,
    "winnerIndex": null
  }
}
```

## Notes

- `snapshot` is exactly the object returned by `GameState.getSnapshot()`.
- `formatVersion` is used for future migrations.
- `savedAt` is an ISO timestamp.
