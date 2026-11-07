import React from 'react'

export const ScoreRow = ({ label, variant = 'normal', isDowngraded = false, bustCount = 0 }) => {
  const rowClassName = `score-row ${isDowngraded ? 'downgrade' : ''}`.trim()
  const bustMarks = bustCount > 0 ? '✗'.repeat(bustCount) : ''

  return (
    <div className={rowClassName} data-variant={variant}>
      <span>{label ?? ' '}</span>
      {bustMarks ? <span className="score-row__bust-marks">{bustMarks}</span> : null}
    </div>
  )
}
