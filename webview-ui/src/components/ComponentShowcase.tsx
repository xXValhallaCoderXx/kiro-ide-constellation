import type { JSX } from 'preact'
import { useState } from 'preact/hooks'

// Import atoms
import { 
  Icon, 
  IconTile, 
  StatusDot, 
  Chip, 
  ButtonIcon, 
  ButtonLink, 
  InputField, 
  KeyboardHintPill, 
  MetricBullet, 
  Tooltip, 
  DividerLine 
} from './atoms'

// Import molecules
import { 
  SelectDropdown, 
  SearchBar, 
  ActionCard, 
  DataStatusCard, 
  MetricsInline, 
  ChipGroup, 
  ZoomControlStack, 
  MiniMapPanel, 
  BreadcrumbItem 
} from './molecules'

export function ComponentShowcase() {
  const [searchValue, setSearchValue] = useState('')
  const [selectValue, setSelectValue] = useState('mode1')
  const [chipSelection, setChipSelection] = useState<number[]>([])

  const showcaseStyle: JSX.CSSProperties = {
    padding: '24px',
    background: 'var(--surface-canvas)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
  }

  const sectionStyle: JSX.CSSProperties = {
    marginBottom: '32px',
  }

  const titleStyle: JSX.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: 'var(--text-primary)',
  }

  const gridStyle: JSX.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  }

  const itemStyle: JSX.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: 'var(--surface-card)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--border-subtle)',
  }

  const labelStyle: JSX.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  }

  return (
    <div style={showcaseStyle}>
      <h1>Constellation UI - Atomic Design Components</h1>
      
      {/* Atoms Section */}
      <div style={sectionStyle}>
        <h2 style={titleStyle}>Atoms</h2>
        
        <div style={gridStyle}>
          <div style={itemStyle}>
            <span style={labelStyle}>Icons (16, 20, 24px)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Icon name="search" size={16} />
              <Icon name="settings" size={20} />
              <Icon name="check" size={24} colorToken="--accent-success" />
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Icon Tiles</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <IconTile variant="brand" iconName="settings" />
              <IconTile variant="success" iconName="check" />
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Status Dots</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusDot status="healthy" size={8} />
              <StatusDot status="warning" size={10} />
              <StatusDot status="error" size={10} />
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Chips</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Chip label="JavaScript" variant="brand" />
              <Chip label="Healthy" variant="success" selected />
              <Chip label="Clickable" variant="brand" onClick={() => console.log('Clicked!')} />
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Button Icons</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ButtonIcon iconName="plus" onClick={() => console.log('Plus')} ariaLabel="Add" />
              <ButtonIcon iconName="minus" onClick={() => console.log('Minus')} ariaLabel="Remove" />
              <ButtonIcon iconName="fullscreen" onClick={() => console.log('Fullscreen')} ariaLabel="Fullscreen" disabled />
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Button Links</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <ButtonLink onClick={() => console.log('Link clicked')}>Re-index Now</ButtonLink>
              <ButtonLink disabled>Disabled Link</ButtonLink>
            </div>
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Misc Elements</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <KeyboardHintPill label="⌘K" />
              <MetricBullet variant="purple" text="42 files" />
              <MetricBullet variant="green" text="Real-time" />
              <Tooltip content="This is a helpful tooltip">
                <span style={{ textDecoration: 'underline', cursor: 'help' }}>Hover me</span>
              </Tooltip>
            </div>
          </div>
        </div>

        <div style={itemStyle}>
          <span style={labelStyle}>Input Field</span>
          <InputField
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search files..."
            leadingIcon="search"
            trailingSlot={<KeyboardHintPill label="⌘K" />}
          />
        </div>
      </div>

      <DividerLine />

      {/* Molecules Section */}
      <div style={sectionStyle}>
        <h2 style={titleStyle}>Molecules</h2>
        
        <div style={gridStyle}>
          <div style={itemStyle}>
            <span style={labelStyle}>Search Bar</span>
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search components..."
              trailingHint="⌘F"
            />
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Select Dropdown</span>
            <SelectDropdown
              label="Analysis Mode"
              options={[
                { label: 'Dependencies', value: 'mode1' },
                { label: 'Impact Analysis', value: 'mode2' },
                { label: 'Architecture', value: 'mode3' },
              ]}
              value={selectValue}
              onChange={setSelectValue}
              helpTooltip="Choose how to analyze your codebase"
            />
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Metrics Inline</span>
            <MetricsInline
              items={[
                { variant: 'purple', text: '42 files' },
                { variant: 'neutral', text: '→' },
                { variant: 'green', text: 'Real-time' },
              ]}
            />
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Chip Group</span>
            <ChipGroup
              chips={[
                { label: 'TypeScript', variant: 'brand', selected: chipSelection.includes(0) },
                { label: 'JavaScript', variant: 'brand', selected: chipSelection.includes(1) },
                { label: 'Healthy', variant: 'success', selected: chipSelection.includes(2) },
              ]}
              onChange={setChipSelection}
              selectMode="multi"
            />
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Zoom Controls</span>
            <ZoomControlStack
              onZoomIn={() => console.log('Zoom in')}
              onZoomOut={() => console.log('Zoom out')}
              onFit={() => console.log('Fit to view')}
            />
          </div>

          <div style={itemStyle}>
            <span style={labelStyle}>Breadcrumb Item</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <BreadcrumbItem label="Root" onClick={() => console.log('Root')} />
              <BreadcrumbItem label="Services" onClick={() => console.log('Services')} />
              <BreadcrumbItem label="UserService" onClick={() => console.log('UserService')} active />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <ActionCard
            title="Scan Dependencies"
            subtitle="Analyze your project structure and find all dependencies"
            variant="brand"
            iconName="search"
            onClick={() => console.log('Scan clicked')}
          />

          <DataStatusCard
            title="Project Analysis"
            lastIndexedText="2 minutes ago"
            filesCount={42}
            depsCount={156}
            status="healthy"
            onReindex={() => console.log('Reindex clicked')}
          />
        </div>

        <MiniMapPanel title="Code Map" hasViewport />
      </div>
    </div>
  )
}