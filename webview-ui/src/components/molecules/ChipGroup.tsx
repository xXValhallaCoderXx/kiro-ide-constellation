import { useState } from 'preact/hooks'
import { Chip } from '../atoms/Chip'

interface ChipItem {
  label: string
  variant: 'brand' | 'success'
  selected?: boolean
}

interface ChipGroupProps {
  chips: ChipItem[]
  onChange?: (chips: ChipItem[]) => void
  selectMode?: 'none' | 'single' | 'multi'
}

export function ChipGroup({ chips, onChange, selectMode = 'none' }: ChipGroupProps) {
  const [items, setItems] = useState(chips)

  function toggle(index: number) {
    const updated = items.map((c, i) => {
      if (i !== index) {
        return selectMode === 'single' ? { ...c, selected: false } : c
      }
      if (selectMode === 'none') return c
      return { ...c, selected: !c.selected }
    })
    setItems(updated)
    onChange?.(updated)
  }

  return (
    <div class="chip-group">
      {items.map((chip, i) => (
        <Chip
          key={i}
          label={chip.label}
          variant={chip.variant}
          onClick={() => toggle(i)}
          selected={chip.selected}
        />
      ))}
    </div>
  )
}
