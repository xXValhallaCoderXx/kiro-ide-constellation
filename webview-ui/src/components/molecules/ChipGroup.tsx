import type { JSX } from 'preact'
import { Chip } from '../atoms/Chip'

interface ChipGroupProps {
  chips: Array<{ 
    label: string
    variant: 'brand' | 'success'
    selected?: boolean 
  }>
  onChange?: (selectedIndices: number[]) => void
  selectMode?: 'none' | 'single' | 'multi'
}

export function ChipGroup({ 
  chips, 
  onChange, 
  selectMode = 'none' 
}: ChipGroupProps) {
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  }

  const handleChipClick = (index: number) => {
    if (!onChange || selectMode === 'none') return

    if (selectMode === 'single') {
      onChange([index])
    } else if (selectMode === 'multi') {
      const currentSelected = chips
        .map((chip, i) => chip.selected ? i : -1)
        .filter(i => i !== -1)
      
      const isSelected = currentSelected.includes(index)
      if (isSelected) {
        onChange(currentSelected.filter(i => i !== index))
      } else {
        onChange([...currentSelected, index])
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      const prevChip = (e.target as HTMLElement).parentElement?.children[index - 1] as HTMLElement
      prevChip?.focus()
    } else if (e.key === 'ArrowRight' && index < chips.length - 1) {
      e.preventDefault()
      const nextChip = (e.target as HTMLElement).parentElement?.children[index + 1] as HTMLElement
      nextChip?.focus()
    }
  }

  return (
    <div 
      style={containerStyle}
      role={selectMode !== 'none' ? 'group' : undefined}
      aria-label={selectMode !== 'none' ? 'Chip selection group' : undefined}
    >
      {chips.map((chip, index) => (
        <Chip
          key={`chip-${index}-${chip.label}`}
          label={chip.label}
          variant={chip.variant}
          selected={chip.selected}
          onClick={selectMode !== 'none' ? () => handleChipClick(index) : undefined}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={selectMode !== 'none' ? 0 : -1}
          aria-pressed={selectMode !== 'none' ? chip.selected : undefined}
        />
      ))}
    </div>
  )
}