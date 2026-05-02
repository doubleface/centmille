import React from 'react'

export const ScoreRow = ({ label, variant = 'normal', isDowngraded = false }) => {
  const rowClassName = `score-row ${variant === 'bust' ? 'bust' : ''} ${isDowngraded ? 'downgrade' : ''}`.trim()

  return (
    <div className={rowClassName} data-variant={variant}>
      <span>{label ?? ' '}</span>
    </div>
  )
}
