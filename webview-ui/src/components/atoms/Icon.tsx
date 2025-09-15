import { JSX } from 'preact'

export type IconName =
  | 'search'
  | 'chevron-down'
  | 'chevron-right'
  | 'help'
  | 'plus'
  | 'minus'
  | 'fullscreen'
  | 'close'
  | 'check'
  | 'clock'
  | 'refresh'
  | 'layout'
  | 'fit'
  | 'arrow-right'

interface IconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'color'> {
  name: IconName
  size?: 16 | 20 | 24
  colorToken?: string // CSS var token name, e.g., '--text-secondary'
  title?: string
}

const paths: Record<IconName, string> = {
  search:
    'M11 11l4 4m-7 1a6 6 0 110-12 6 6 0 010 12z',
  'chevron-down':
    'M6 9l4 4 4-4',
  'chevron-right':
    'M9 6l4 4-4 4',
  help:
    'M9 10a2 2 0 113-1.732V9a1 1 0 01-1 1h-1m1 3h-.01',
  plus:
    'M12 5v14M5 12h14',
  minus:
    'M5 12h14',
  fullscreen:
    'M7 14v3h3M7 10V7h3M17 14v3h-3M17 10V7h-3',
  close:
    'M6 6l12 12M18 6L6 18',
  check:
    'M5 13l4 4L19 7',
  clock:
    'M12 8v5l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  refresh:
    'M4 4v6h6M20 20v-6h-6M20 9a8 8 0 10-6.906 12',
  layout:
    'M4 5h16v4H4zM4 11h7v8H4zM13 11h7v8h-7z',
  fit:
    'M8 8h3V5M8 8V5h3M16 16h-3v3M16 16v3h-3M8 16H5v3M8 16v3H5M16 8h3V5M16 8V5h3',
  'arrow-right':
    'M5 12h14M13 5l7 7-7 7'
}

export function Icon({ name, size = 20, colorToken, title, ...rest }: IconProps) {
  const px = size
  const colorStyle = colorToken ? { color: `var(${colorToken})` } : undefined
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : 'presentation'}
      style={colorStyle}
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={paths[name]} />
    </svg>
  )
}
