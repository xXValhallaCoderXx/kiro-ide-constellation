interface ModeSelectorrops {
  currentMode: 'Default' | 'Onboarding'
  onModeChange: (mode: 'Default' | 'Onboarding') => void
  disabled?: boolean
}

export function ModeSelector({ currentMode, onModeChange, disabled = false }: ModeSelectorrops) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    onModeChange(target.value as 'Default' | 'Onboarding')
  }

  return (
    <div class="constellation-mode-selector">
      <select
        class="constellation-mode-dropdown"
        value={currentMode}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="Default">Development Mode</option>
        <option value="Onboarding">Onboarding Mode</option>
      </select>
      <span class="constellation-help-icon" title="Switch between development and onboarding modes">
        ❓
      </span>
    </div>
  )
}