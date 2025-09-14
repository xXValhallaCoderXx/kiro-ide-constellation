import type { JSX } from 'preact'

const paths: Record<string, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6" stroke-width="2" />
      <line x1="16" y1="16" x2="22" y2="22" stroke-width="2" />
    </>
  ),
  'chevron-down': <polyline points="6 9 12 15 18 9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />, 
  'chevron-right': <polyline points="9 6 15 12 9 18" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />, 
  help: (
    <>
      <circle cx="12" cy="12" r="10" stroke-width="2" />
      <path d="M9 9a3 3 0 116 0c0 2-3 2-3 5" fill="none" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="17" r="1" />
    </>
  ),
  check: <polyline points="5 13 9 17 19 7" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />, 
  plus: <g stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
  minus: <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round" />, 
  fullscreen: (
    <>
      <polyline points="3 9 3 3 9 3" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="15 3 21 3 21 9" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="21 15 21 21 15 21" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="9 21 3 21 3 15" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" stroke-width="2" />
      <polyline points="12 6 12 12 16 14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" stroke-width="2" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.06A1.65 1.65 0 0011 3.09V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.06a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.06A1.65 1.65 0 0020.91 11H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </>
  )
}

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  size?: 16 | 20 | 24
  colorToken?: string
  title?: string
}

export function Icon({ name, size = 16, colorToken = '--text-secondary', title }: IconProps) {
  const path = paths[name]
  if (!path) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={{ color: `var(${colorToken})` }}
      aria-hidden={title ? undefined : 'true'}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  )
}
