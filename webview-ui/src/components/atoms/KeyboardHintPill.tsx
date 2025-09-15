import { JSX } from 'preact'

interface KeyboardHintPillProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  label: string
}

export function KeyboardHintPill({ label, ...rest }: KeyboardHintPillProps) {
  const className = ['kbd-pill', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return <span class={className} {...props}>{label}</span>
}
