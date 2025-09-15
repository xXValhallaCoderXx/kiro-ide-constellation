import { JSX } from 'preact'

interface DividerLineProps extends JSX.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export function DividerLine({ orientation = 'horizontal', ...rest }: DividerLineProps) {
  const className = ['divider-line', `divider-${orientation}`, (rest as any).class ?? '']
    .filter(Boolean)
    .join(' ')
  const props = { ...rest } as any
  delete props.class
  return <div class={className} {...props} />
}
