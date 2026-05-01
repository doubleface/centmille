import { Box, Text } from 'ink'
import React from 'react'

const DICE_FACES = {
  1: ['┌─────┐', '│     │', '│  •  │', '│     │', '└─────┘'],
  2: ['┌─────┐', '│•    │', '│     │', '│    •│', '└─────┘'],
  3: ['┌─────┐', '│•    │', '│  •  │', '│    •│', '└─────┘'],
  4: ['┌─────┐', '│•   •│', '│     │', '│•   •│', '└─────┘'],
  5: ['┌─────┐', '│•   •│', '│  •  │', '│•   •│', '└─────┘'],
  6: ['┌─────┐', '│•   •│', '│•   •│', '│•   •│', '└─────┘'],
}

const buildSelectedMask = (rolledDice, selectedDice) => {
  const counts = new Map()
  for (const value of selectedDice) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return rolledDice.map((value) => {
    const remaining = counts.get(value) ?? 0
    if (remaining > 0) {
      counts.set(value, remaining - 1)
      return true
    }
    return false
  })
}

export const DiceView = ({ rolledDice, selectedDice }) => {
  if (!rolledDice || rolledDice.length === 0) return <Text>Aucun lancer</Text>

  const selectedMask = buildSelectedMask(rolledDice, selectedDice)

  return (
    <Box flexDirection="column">
      {[0, 1, 2, 3, 4].map((lineIndex) => (
        <Box key={`line-${lineIndex}`}>
          {rolledDice.map((value, index) => (
            <Box key={`${index}-${value}-${lineIndex}`} marginRight={1}>
              <Text color={selectedMask[index] ? 'green' : 'white'}>{DICE_FACES[value]?.[lineIndex] ?? '│  ?  │'}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
