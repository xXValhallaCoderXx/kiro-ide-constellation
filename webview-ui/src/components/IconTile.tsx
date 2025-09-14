interface IconTileProps {
  accent: 'brand' | 'success'
  children: string // Icon character/emoji
}

export function IconTile({ accent, children }: IconTileProps) {
  return (
    <div class={`constellation-icon-tile constellation-icon-tile--${accent}`}>
      {children}
    </div>
  )
}