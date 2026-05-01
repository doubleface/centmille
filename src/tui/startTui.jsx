import { Box, render, Text, useApp, useInput } from 'ink'
import React from 'react'

const HelpLine = () => (
  <Text color="gray">q/Esc/Ctrl+C quit | n new | l load | r roll | k keep | s stop | f fail | w save</Text>
)

const Section = ({ title, children }) => (
  <Box
    borderStyle="round"
    borderColor="cyan"
    flexDirection="column"
    paddingX={1}
    paddingY={0}
    marginBottom={1}
  >
    <Text color="cyanBright">{title}</Text>
    {children}
  </Box>
)

const App = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || key.escape || (key.ctrl && input === 'c')) {
      exit()
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="greenBright">centmille TUI (ink)</Text>
      <HelpLine />
      <Section title="Scores">
        <Text>No active game yet. Press n to start a game.</Text>
      </Section>
      <Section title="Current turn">
        <Text>Active turn: none</Text>
        <Text>Staged roll: none</Text>
      </Section>
      <Section title="Session history">
        <Text>- none</Text>
      </Section>
    </Box>
  )
}

export const startTui = () => {
  render(<App />)
}
