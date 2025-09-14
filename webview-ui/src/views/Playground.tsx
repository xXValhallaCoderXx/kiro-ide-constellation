import { Icon } from '../components/atoms/Icon'
import { IconTile } from '../components/atoms/IconTile'
import { StatusDot } from '../components/atoms/StatusDot'
import { Chip } from '../components/atoms/Chip'
import { ButtonIcon } from '../components/atoms/ButtonIcon'
import { ButtonLink } from '../components/atoms/ButtonLink'
import { InputField } from '../components/atoms/InputField'
import { KeyboardHintPill } from '../components/atoms/KeyboardHintPill'
import { MetricBullet } from '../components/atoms/MetricBullet'
import { Tooltip } from '../components/atoms/Tooltip'
import { DividerLine } from '../components/atoms/DividerLine'
import { SearchBar } from '../components/molecules/SearchBar'
import { ActionCard } from '../components/molecules/ActionCard'
import { DataStatusCard } from '../components/molecules/DataStatusCard'
import { MetricsInline } from '../components/molecules/MetricsInline'
import { ChipGroup } from '../components/molecules/ChipGroup'
import { ZoomControlStack } from '../components/molecules/ZoomControlStack'
import { MiniMapPanel } from '../components/molecules/MiniMapPanel'
import { BreadcrumbItem } from '../components/molecules/BreadcrumbItem'
import { SelectDropdown } from '../components/molecules/SelectDropdown'
import { useState } from 'preact/hooks'

export function Playground() {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('one')
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)' }}>
      <h2>Atoms</h2>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Icon name="search" />
        <IconTile variant="brand" iconName="plus" />
        <StatusDot status="healthy" size={8} />
        <Chip label="JavaScript" variant="brand" />
        <ButtonIcon iconName="plus" ariaLabel="Add" onClick={() => {}} />
        <ButtonLink onClick={() => {}}>Re-index Now</ButtonLink>
        <InputField value="" onChange={() => {}} ariaLabel="example" placeholder="Input" />
        <KeyboardHintPill label="⌘K" />
        <MetricBullet variant="green" text="42" />
        <Tooltip content="Hello"><span>Hover me</span></Tooltip>
        <DividerLine />
      </div>

      <h2>Molecules</h2>
      <SearchBar value={search} onChange={setSearch} placeholder="Search" trailingHint="⌘K" />
      <SelectDropdown
        options={[{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }]}
        value={mode}
        onChange={setMode}
        helpTooltip="Choose mode"
      />
      <ActionCard title="Title" subtitle="Subtitle" variant="brand" iconName="plus" />
      <DataStatusCard
        title="Repo data"
        lastIndexedText="Indexed today"
        filesCount={10}
        depsCount={5}
        status="healthy"
        onReindex={() => {}}
      />
      <MetricsInline items={[{ variant: 'purple', text: '10 files' }, { variant: 'green', text: 'Real-time' }]} />
      <ChipGroup
        chips={[{ label: 'JS', variant: 'brand' }, { label: 'TS', variant: 'success' }]}
        selectMode="multi"
      />
      <ZoomControlStack onZoomIn={() => {}} onZoomOut={() => {}} onFit={() => {}} />
      <MiniMapPanel hasViewport />
      <div style={{ display: 'flex', gap: '4px' }}>
        <BreadcrumbItem label="root" onClick={() => {}} />
        <BreadcrumbItem label="src" onClick={() => {}} />
        <BreadcrumbItem label="index.ts" active onClick={() => {}} />
      </div>
    </div>
  )
}
