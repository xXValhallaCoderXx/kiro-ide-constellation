import { useState, useEffect } from 'preact/hooks'
import { Button } from './Button'
import { messenger } from '../services/messenger'

interface OnboardingModeToggleProps {
  currentMode?: 'Default' | 'Onboarding'
  onModeChange?: (mode: 'Default' | 'Onboarding') => void
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

export function OnboardingModeToggle({ 
  currentMode = 'Default', 
  onModeChange,
  isLoading = false 
}: OnboardingModeToggleProps) {
  const [selectedMode, setSelectedMode] = useState<'Default' | 'Onboarding'>(currentMode)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingMode, setPendingMode] = useState<'Default' | 'Onboarding' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update selected mode when currentMode prop changes
  useEffect(() => {
    setSelectedMode(currentMode)
  }, [currentMode])

  // Listen for mode change responses from extension
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'onboarding/mode-changed') {
        setIsProcessing(false)
        setSelectedMode(msg.mode)
        onModeChange?.(msg.mode)
        setError(null)
      } else if (msg.type === 'onboarding/mode-error') {
        setIsProcessing(false)
        setError(msg.message || 'Failed to change mode')
        // Revert to previous mode on error
        setSelectedMode(currentMode)
      }
    }

    messenger.on(handleMessage)
    
    // Cleanup function would be needed if messenger.on returned an unsubscribe function
    // For now, we rely on the component unmounting to stop listening
  }, [currentMode, onModeChange])

  const handleModeChange = (newMode: 'Default' | 'Onboarding') => {
    if (newMode === selectedMode || isProcessing) return

    setPendingMode(newMode)
    setShowConfirmation(true)
    setError(null)
  }

  const handleConfirmModeChange = () => {
    if (!pendingMode) return

    setIsProcessing(true)
    setShowConfirmation(false)

    // Send mode change request to extension
    messenger.post('onboarding/change-mode', { mode: pendingMode })
    
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
    } else {
      return {
        title: 'Switch to Default Mode',
        message: 'This will restore your previous steering documents and deactivate the onboarding persona. Any onboarding progress will be preserved.',
        confirmText: 'Switch to Default',
        cancelText: 'Cancel'
      }
    }
  }

  const confirmationContent = getConfirmationContent()

  return (
    <div className="onboarding-mode-toggle">
      <div className="mode-toggle-header">
        <label className="mode-toggle-label">Mode:</label>
        <div className="mode-toggle-controls">
          <select
            className="mode-toggle-dropdown"
            value={selectedMode}
            onChange={(e) => handleModeChange((e.target as HTMLSelectElement).value as 'Default' | 'Onboarding')}
            disabled={isLoading || isProcessing}
          >
            <option value="Default">Default</option>
            <option value="Onboarding">Onboarding</option>
          </select>
          {(isLoading || isProcessing) && (
            <div className="mode-toggle-spinner">
              <span className="spinner">⟳</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mode-toggle-status">
        <span className={`mode-indicator mode-indicator-${selectedMode.toLowerCase()}`}>
          {selectedMode} Mode
        </span>
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