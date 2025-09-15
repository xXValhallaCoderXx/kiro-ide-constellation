import { useState, useEffect } from 'preact/hooks'
import { messenger } from '../services/messenger'
import { StatusDot } from './atoms/StatusDot'

interface OnboardingStatusProps {
  isActive?: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
}

interface OnboardingStatusState {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
  isComplete: boolean
  error?: string
  isCleanedUp: boolean
  cleanupMessage?: string
}

export function OnboardingStatus({
  isActive = false,
  currentStep,
  totalSteps,
  currentFile,
  explanation
}: OnboardingStatusProps) {
  const [status, setStatus] = useState<OnboardingStatusState>({
    isActive,
    currentStep,
    totalSteps,
    currentFile,
    explanation,
    isComplete: false,
    isCleanedUp: false
  })

  // Listen for status updates from extension
  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'onboarding/status-update') {
        setStatus(prev => ({
          ...prev,
          ...msg.payload,
          isComplete: false,
          error: undefined,
          isCleanedUp: false
        }))
      } else if (msg.type === 'onboarding/walkthrough-complete') {
        setStatus(prev => ({
          ...prev,
          isComplete: true,
          error: undefined,
          isCleanedUp: false
        }))
      } else if (msg.type === 'onboarding/walkthrough-error') {
        setStatus(prev => ({
          ...prev,
          error: msg.message,
          isComplete: false,
          isCleanedUp: false
        }))
      } else if (msg.type === 'onboarding/finalize-complete') {
        setStatus(prev => ({
          ...prev,
          isActive: false,
          isComplete: false,
          isCleanedUp: true,
          cleanupMessage: 'Tour cleaned up - switched back to Default mode',
          error: undefined
        }))
      }
    }

    messenger.on(handleMessage)
    
    // Request current status on mount
    messenger.post('onboarding/get-status')
  }, [])

  // Update local state when props change
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      isActive,
      currentStep,
      totalSteps,
      currentFile,
      explanation
    }))
  }, [isActive, currentStep, totalSteps, currentFile, explanation])

  const handleDismissError = () => {
    setStatus(prev => ({ ...prev, error: undefined }))
  }

  const handleDismissComplete = () => {
    setStatus(prev => ({ ...prev, isComplete: false }))
  }

  const handleDismissCleanup = () => {
    setStatus(prev => ({ ...prev, isCleanedUp: false, cleanupMessage: undefined }))
  }

  // Don't render anything if not active and no completion/error/cleanup state
  if (!status.isActive && !status.isComplete && !status.error && !status.isCleanedUp) {
    return null
  }

  return (
    <div className="onboarding-status">
      {/* Active walkthrough status */}
      {status.isActive && (
        <div className="onboarding-status-active">
          <div className="onboarding-status-header">
            <div className="onboarding-status-indicator">
              <StatusDot status="healthy" size={10} />
              <span className="status-label">Walkthrough Active</span>
            </div>
            {status.currentStep !== undefined && status.totalSteps !== undefined && (
              <div className="onboarding-status-progress">
                <span className="progress-text">
                  Step {status.currentStep} of {status.totalSteps}
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(status.currentStep / status.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Current step information */}
          {(status.currentFile || status.explanation) && (
            <div className="onboarding-status-details">
              {status.currentFile && (
                <div className="onboarding-status-file">
                  <span className="file-icon">📄</span>
                  <span className="file-path">{status.currentFile}</span>
                </div>
              )}
              {status.explanation && (
                <div className="onboarding-status-explanation">
                  <p className="explanation-text">{status.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion notification */}
      {status.isComplete && (
        <div className="onboarding-status-complete">
          <div className="complete-content">
            <span className="complete-icon">✅</span>
            <span className="complete-message">Walkthrough complete</span>
          </div>
          <button 
            className="complete-dismiss"
            onClick={handleDismissComplete}
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Error notification */}
      {status.error && (
        <div className="onboarding-status-error">
          <div className="error-content">
            <span className="error-icon">⚠</span>
            <span className="error-message">{status.error}</span>
          </div>
          <button 
            className="error-dismiss"
            onClick={handleDismissError}
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Cleanup notification */}
      {status.isCleanedUp && (
        <div className="onboarding-status-cleanup">
          <div className="cleanup-content">
            <span className="cleanup-icon">🧹</span>
            <span className="cleanup-message">{status.cleanupMessage || 'Tour cleaned up'}</span>
          </div>
          <button 
            className="cleanup-dismiss"
            onClick={handleDismissCleanup}
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}