interface KeyboardHintPillProps {
  label: string
}

export function KeyboardHintPill({ label }: KeyboardHintPillProps) {
  return (
    <span class="kbd-pill" aria-hidden="true">
      {label}
    </span>
  )
}
