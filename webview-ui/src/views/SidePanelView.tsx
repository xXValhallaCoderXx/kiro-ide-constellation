import { useState, useEffect } from 'preact/hooks'
import { Button } from '../components/Button'
import { AgentModeToggle } from '../components/agent-mode-toggle'
import { OnboardingStatus } from '../components/OnboardingStatus'
import { messenger } from '../services/messenger'

interface OnboardingStatusState {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
}

export function SidePanelView() {
  const [currentMode, setCurrentMode] = useState<'Default' | 'Onboarding' | 'OpenSource'>('Default')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusState>({
    isActive: false
  })

  useEffect(() => {
    // Request current mode and status on component mount
    messenger.post('agent-mode/get')
    messenger.post('onboarding/get-status')
    
    // Listen for onboarding- and agent-mode-related messages
    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'agent-mode/current':
          setCurrentMode(msg.mode)
          setIsLoading(false)
          break
        case 'agent-mode/changed':
          setCurrentMode(msg.mode)
          setIsLoading(false)
          break
        case 'agent-mode/error':
          setIsLoading(false)
          // Error handling is managed by AgentModeToggle component
          break
        case 'onboarding/status-update':
          setOnboardingStatus(prev => ({
            ...prev,
            ...msg.payload
          }))
          break
        case 'onboarding/walkthrough-complete':
          setOnboardingStatus(prev => ({
            ...prev,
            isActive: false
          }))
          break
        case 'onboarding/walkthrough-error':
          // Error handling is managed by OnboardingStatus component
          break
        case 'onboarding/finalize-complete':
          // Finalize complete - ensure Default mode and no active walkthrough
          setCurrentMode('Default')
          setOnboardingStatus({
            isActive: false
          })
          break
      }
    }

    messenger.on(handleMessage)
  }, [])

  const openGraph = () => {
    messenger.post('open-graph-view')
  }

  const handleModeChange = (mode: 'Default' | 'Onboarding' | 'OpenSource') => {
    setIsLoading(true)
    setCurrentMode(mode)
  }

  return (
    <div>
      <AgentModeToggle 
        currentMode={currentMode}
        onModeChange={handleModeChange}
        isLoading={isLoading}
      />
      <OnboardingStatus 
        isActive={onboardingStatus.isActive}
        currentStep={onboardingStatus.currentStep}
        totalSteps={onboardingStatus.totalSteps}
        currentFile={onboardingStatus.currentFile}
        explanation={onboardingStatus.explanation}
      />
      <div style={{ padding: '12px' }}>
        <h1>Constellation</h1>
        <p>Side Panel</p>
        <Button onClick={openGraph}>Open Graph View</Button>
      </div>
    </div>
  )
}

