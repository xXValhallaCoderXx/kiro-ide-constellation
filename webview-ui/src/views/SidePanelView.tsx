import { useState, useEffect } from 'preact/hooks'
import { Button } from '../components/Button'
import { OnboardingModeToggle } from '../components/OnboardingModeToggle'
import { OnboardingStatus } from '../components/OnboardingStatus'
import { SidebarShell } from '../components/SidebarShell'
import { ConstellationHeader } from '../components/ConstellationHeader'
import { SectionHeader } from '../components/SectionHeader'
import { ModeSelector } from '../components/ModeSelector'
import { ActionCard } from '../components/ActionCard'
import { DataStatusCard } from '../components/DataStatusCard'
import { messenger } from '../services/messenger'

interface OnboardingStatusState {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
}

export function SidePanelView() {
  const [currentMode, setCurrentMode] = useState<'Default' | 'Onboarding'>('Default')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusState>({
    isActive: false
  })

  useEffect(() => {
    // Request current mode and status on component mount
    messenger.post('onboarding/get-mode')
    messenger.post('onboarding/get-status')
    
    // Listen for onboarding-related messages
    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'onboarding/current-mode':
          setCurrentMode(msg.mode)
          setIsLoading(false)
          break
        case 'onboarding/mode-changed':
          setCurrentMode(msg.mode)
          setIsLoading(false)
          break
        case 'onboarding/mode-error':
          setIsLoading(false)
          // Error handling is managed by OnboardingModeToggle component
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

  const handleModeChange = (mode: 'Default' | 'Onboarding') => {
    setIsLoading(true)
    setCurrentMode(mode)
  }

  const handleReindex = () => {
    // TODO: Implement re-index functionality
    console.log('Re-index requested')
  }

  return (
    <div>
      <OnboardingModeToggle 
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
      
      <SidebarShell>
        <ConstellationHeader />
        
        <div>
          <SectionHeader label="MODE">
            <span class="constellation-help-icon" title="Switch between development and onboarding modes">❓</span>
          </SectionHeader>
          <ModeSelector 
            currentMode={currentMode}
            onModeChange={handleModeChange}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <SectionHeader label="ACTIONS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionCard
              icon="🌐"
              title="Project Graph"
              subtitle="Visualize project structure"
              accent="brand"
              onClick={openGraph}
            />
            <ActionCard
              icon="📊"
              title="Health Dashboard"
              subtitle="Monitor code quality metrics"
              accent="success"
              disabled={true}
            />
          </div>
        </div>
        
        <div>
          <SectionHeader label="DATA" />
          <DataStatusCard
            title="Codebase Index Status"
            subline="Last indexed 2 minutes ago"
            filesCount={42}
            depsCount={18}
            onReindex={handleReindex}
          />
        </div>
      </SidebarShell>
    </div>
  )
}

