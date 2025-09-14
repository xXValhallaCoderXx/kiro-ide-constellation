interface LinkActionProps {
  children: string
  onClick?: () => void
}

export function LinkAction({ children, onClick }: LinkActionProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onClick) {
        onClick()
      }
    }
  }

  return (
    <button
      class="constellation-link-action"
      onClick={handleClick}
      onKeyDown={handleKeyDown as any}
      tabIndex={0}
    >
      {children}
    </button>
  )
}