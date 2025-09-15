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

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

// Mode descriptions for tooltips
const MODE_DESCRIPTIONS = {
  Default: 'Standard mode with your current project configuration and settings.',
  Onboarding: 'Guided mode that helps new users learn Constellation features step by step.',
  OpenSource: 'Specialized mode for open source project analysis and contribution workflows.'
} as const

function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmationDialogProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <Button 
            onClick={onCancel} 
            disabled={isLoading}
            className="modal-button modal-button-secondary"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="modal-button modal-button-primary"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AgentModeToggle({ 
  currentMode = 'Default', 
  onModeChange,
  isLoading = false 
}: AgentModeToggleProps) {
  const [selectedMode, setSelectedMode] = useState<'Default' | 'Onboarding' | 'OpenSource'>(currentMode)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingMode, setPendingMode] = useState<'Default' | 'Onboarding' | 'OpenSource' | null>(null)
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
    setPendingMode(newMode)
    setShowConfirmation(true)
    setError(null)
  }

  const handleConfirmModeChange = () => {
    if (!pendingMode) return
    setIsProcessing(true)
    setShowConfirmation(false)
    messenger.post('agent-mode/change', { mode: pendingMode })
    setPendingMode(null)
  }

  const handleCancelModeChange = () => {
    setShowConfirmation(false)
    setPendingMode(null)
    setError(null)
  }

  const getConfirmationContent = () => {
    if (pendingMode === 'Onboarding') {
      return {
        title: 'Switch to Onboarding Mode',
        message: 'This will backup your current steering documents and activate the onboarding persona. Your existing configuration will be safely stored and can be restored later.',
        confirmText: 'Switch to Onboarding',
        cancelText: 'Cancel'
      }
    } else if (pendingMode === 'OpenSource') {
      return {
        title: 'Switch to Open Source Mode',
        message: 'This will backup your current steering documents and activate the OSS contributor persona. It will also prepare .constellation/oss for analysis and planning.',
        confirmText: 'Switch to Open Source',
        cancelText: 'Cancel'
      }
    } else {
      return {
        title: 'Switch to Default Mode',
        message: 'This will restore your previous steering documents and deactivate special personas. Any analysis artifacts remain under .constellation/oss.',
        confirmText: 'Switch to Default',
        cancelText: 'Cancel'
      }
    }
  }

  const confirmationContent = getConfirmationContent()

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
        {(isLoading || isProcessing) && (
          <div className="mode-toggle-spinner">
            <span className="spinner">⟳</span>
          </div>
        )}
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

      <ConfirmationDialog
        isOpen={showConfirmation}
        title={confirmationContent.title}
        message={confirmationContent.message}
        confirmText={confirmationContent.confirmText}
        cancelText={confirmationContent.cancelText}
        onConfirm={handleConfirmModeChange}
        onCancel={handleCancelModeChange}
        isLoading={isProcessing}
      />
    </div>
  )
}

