import React from 'react';
import Chip from '../atoms/Chip';
import './ChipGroup.css';

interface ChipInfo {
  label: string;
  variant: 'brand' | 'success';
  selected?: boolean;
}

interface ChipGroupProps {
  chips: ChipInfo[];
  onChange?: (updatedChips: ChipInfo[]) => void;
  selectMode?: 'none' | 'single' | 'multi';
}

// TODO: Implement keyboard traversal for accessibility.

const ChipGroup: React.FC<ChipGroupProps> = ({
  chips,
  onChange,
  selectMode = 'none',
}) => {
  const handleChipClick = (index: number) => {
    if (selectMode === 'none' || !onChange) {
      return;
    }

    let newChips = [...chips];

    if (selectMode === 'single') {
      newChips = newChips.map((chip, i) => ({
        ...chip,
        selected: i === index ? !chip.selected : false,
      }));
    } else { // multi
      newChips[index].selected = !newChips[index].selected;
    }

    onChange(newChips);
  };

  return (
    <div className="chip-group" role="group">
      {chips.map((chip, index) => (
        <Chip
          key={chip.label}
          label={chip.label}
          variant={chip.variant}
          selected={chip.selected}
          onClick={selectMode !== 'none' ? () => handleChipClick(index) : undefined}
          aria-pressed={chip.selected}
        />
      ))}
    </div>
  );
};

export default ChipGroup;
