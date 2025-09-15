import { useState, useEffect } from 'preact/hooks'
import { Button } from './Button'
import { Icon } from './atoms/Icon'
import { Tooltip } from './atoms/Tooltip'
import { messenger } from '../services/messenger'
import { SelectDropdown } from './molecules/SelectDropdown'

interface AgentModeToggleProps {
  currentMode?: 'Default' | 'Onboarding' | 'OpenSource'
  onModeChange?: (mode: 'Default' | 'Onboarding' | 'OpenSource') => void
  isLoading?: boolean
}

// Mode descriptions for tooltips
const MODE_DESCRIPTIONS = {
  Default: 'Standard mode with your current project configuration and settings.',
  Onboarding: 'Guided mode that helps new users learn Constellation features step by step.',
  OpenSource: 'Specialized mode for open source project analysis and contribution workflows.'
} as const

export function AgentModeToggle({ 
  currentMode = 'Default', 
  onModeChange,
  isLoading = false 
}: AgentModeToggleProps) {
  const [selectedMode, setSelectedMode] = useState<'Default' | 'Onboarding' | 'OpenSource'>(currentMode)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setSelectedMode(currentMode) }, [currentMode])

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'agent-mode/changed') {
        setIsProcessing(false)
        setSelectedMode(msg.mode)
        onModeChange?.(msg.mode)
        setError(null)
      } else if (msg.type === 'agent-mode/error') {
        setIsProcessing(false)
        setError(msg.message || 'Failed to change mode')
        setSelectedMode(currentMode)
      } else if (msg.type === 'agent-mode/current') {
        setSelectedMode(msg.mode)
      }
    }
    messenger.on(handleMessage)
  }, [currentMode, onModeChange])

  const handleModeChange = (newMode: 'Default' | 'Onboarding' | 'OpenSource') => {
    if (newMode === selectedMode || isProcessing) return
    setIsProcessing(true)
    setError(null)
    messenger.post('agent-mode/change', { mode: newMode })
  }

  return (
    <div className="onboarding-mode-toggle">
      <div className="mode-toggle-header">
        <div className="mode-label-with-help">
          <label className="mode-toggle-label">Modes</label>
          <Tooltip content={MODE_DESCRIPTIONS[selectedMode]} placement="bottom">
            <div 
              className="mode-help-icon"
              tabIndex={0}
              role="button"
              aria-label={`Help for ${selectedMode} mode`}
            >
              <Icon name="info" size={16} colorToken="--text-secondary" />
            </div>
          </Tooltip>
        </div>
      </div>
      <div className="mode-toggle-controls">
        <SelectDropdown
          options={[
            { label: 'Default', value: 'Default' },
            { label: 'Onboarding', value: 'Onboarding' },
            { label: 'Open Source', value: 'OpenSource' },
          ]}
          value={selectedMode}
          onChange={(v) => handleModeChange(v as 'Default' | 'Onboarding' | 'OpenSource')}
          disabled={isLoading || isProcessing}
        />
      </div>
      {error && (
        <div className="mode-toggle-error">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error}</span>
          <Button 
            onClick={() => setError(null)}
            className="error-dismiss"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}

