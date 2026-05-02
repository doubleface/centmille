import { useEffect, useRef, useState } from 'react'

export const CornerMenu = ({ onUndo, onResetGame, canUndo = true }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const containerRef = useRef(null)

  const closeMenu = () => {
    setIsOpen(false)
    setIsConfirmingReset(false)
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        closeMenu()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleUndo = () => {
    onUndo()
    closeMenu()
  }

  const handleResetClick = () => {
    setIsConfirmingReset(true)
  }

  const handleResetConfirm = () => {
    onResetGame()
    closeMenu()
  }

  return (
    <div ref={containerRef}>
      <button
        type="button"
        className="dogear"
        aria-label="Menu de la partie"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      />

      {isOpen ? (
        <div className="corner-menu" role="menu">
          {!isConfirmingReset ? (
            <>
              <button
                type="button"
                className="corner-menu__item"
                role="menuitem"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <span className="corner-menu__icon">↺</span>
                Annuler le dernier tour
              </button>
              <div className="corner-menu__sep" />
              <button
                type="button"
                className="corner-menu__item corner-menu__item--danger"
                role="menuitem"
                onClick={handleResetClick}
              >
                <span className="corner-menu__icon">✗</span>
                Recommencer la partie
              </button>
            </>
          ) : (
            <div className="corner-menu__confirm">
              <p className="corner-menu__confirm-title">Recommencer la partie ?</p>
              <div className="corner-menu__confirm-actions">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleResetConfirm}
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsConfirmingReset(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
