import { JSX } from 'preact'
import { Chip } from '../atoms/Chip'

export type ChipItem = { label: string; variant: 'brand' | 'success'; selected?: boolean; value?: string }

interface ChipGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  chips: ChipItem[]
  selectMode?: 'none' | 'single' | 'multi'
  onChange?: (chips: ChipItem[]) => void
  disabled?: boolean
  chipTestIdFactory?: (chip: ChipItem, index: number) => string
}

export function ChipGroup({ chips, selectMode = 'none', onChange, disabled, chipTestIdFactory, ...rest }: ChipGroupProps) {
  const className = ['chip-group', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  const toggle = (idx: number) => {
    if (selectMode === 'none') return
    const next = chips.map((c, i) => {
      if (i !== idx) return selectMode === 'single' ? { ...c, selected: false } : c
      return { ...c, selected: selectMode === 'multi' ? !c.selected : true }
    })
    onChange?.(next)
  }

  return (
    <div class={className} role="group" {...props}>
      {chips.map((chip, i) => (
        <Chip
          key={(chip.value ?? chip.label) + i}
          label={chip.label}
          variant={chip.variant}
          selected={!!chip.selected}
          onClick={() => toggle(i)}
          disabled={disabled}
          aria-disabled={disabled ? true : undefined}
          data-placeholder={disabled ? 'true' : undefined}
          data-testid={chipTestIdFactory ? chipTestIdFactory(chip, i) : undefined}
        />
      ))}
    </div>
  )
}
