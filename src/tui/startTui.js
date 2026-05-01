import { Box, render, Text, useApp, useInput } from 'ink'
import React from 'react'

const HelpLine = () =>
  React.createElement(
    Text,
    { color: 'gray' },
    'q/Esc/Ctrl+C quit | n new | l load | r roll | k keep | s stop | f fail | w save'
  )

const Section = ({ title, children }) =>
  React.createElement(
    Box,
    {
      borderStyle: 'round',
      borderColor: 'cyan',
      flexDirection: 'column',
      paddingX: 1,
      paddingY: 0,
      marginBottom: 1,
    },
    React.createElement(Text, { color: 'cyanBright' }, title),
    children
  )

const App = () => {
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || key.escape || (key.ctrl && input === 'c')) {
      exit()
    }
  })

  return React.createElement(
    Box,
    { flexDirection: 'column', paddingX: 1 },
    React.createElement(Text, { color: 'greenBright' }, 'centmille TUI (ink)'),
    React.createElement(HelpLine),
    React.createElement(
      Section,
      { title: 'Scores' },
      React.createElement(Text, null, 'No active game yet. Press n to start a game.')
    ),
    React.createElement(
      Section,
      { title: 'Current turn' },
      React.createElement(Text, null, 'Active turn: none'),
      React.createElement(Text, null, 'Staged roll: none')
    ),
    React.createElement(
      Section,
      { title: 'Session history' },
      React.createElement(Text, null, '- none')
    )
  )
}

export const startTui = () => {
  render(React.createElement(App))
}
