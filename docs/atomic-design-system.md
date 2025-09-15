# Atomic Design System

## Overview

Kiro Constellation implements an atomic design system for its Preact-based webview UI. This approach creates a scalable, maintainable component architecture by organizing UI elements into atoms, molecules, and organisms with clear composition patterns.

## Design Principles

### Atomic Hierarchy
- **Atoms**: Basic building blocks (buttons, icons, inputs)
- **Molecules**: Simple combinations of atoms (search bars, metric displays)
- **Organisms**: Complex components combining molecules and atoms (panels, toolbars)
- **Templates**: Page-level layouts (not yet implemented)
- **Pages**: Complete views (SidePanelView, GraphDashboard)

### Composition Patterns
- **Single Responsibility**: Each component has one clear purpose
- **Prop Consistency**: Similar props across related components
- **Accessibility First**: ARIA attributes and keyboard navigation built-in
- **Performance Aware**: Efficient rendering and memory management

## Atoms (`webview-ui/src/components/atoms/`)

### ButtonIcon
**Purpose**: Icon-based button with consistent sizing and accessibility

```typescript
interface ButtonIconProps {
  iconName: string
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
  size?: number
  variant?: 'default' | 'primary' | 'secondary'
}
```

**Usage Examples:**
```tsx
<ButtonIcon iconName="plus" ariaLabel="Add item" onClick={handleAdd} />
<ButtonIcon iconName="close" ariaLabel="Close panel" onClick={handleClose} size={24} />
```

### Icon
**Purpose**: SVG icon rendering with consistent styling

```typescript
interface IconProps {
  name: string
  size?: number
  color?: string
  className?: string
}
```

### MetricBullet
**Purpose**: Small metric display with color-coded variants

```typescript
interface MetricBulletProps {
  variant: 'purple' | 'green' | 'neutral'
  text: string
}
```

**Usage Examples:**
```tsx
<MetricBullet variant="green" text="15 commits" />
<MetricBullet variant="purple" text="High activity" />
```

### StatusDot
**Purpose**: Status indicator with semantic color coding

```typescript
interface StatusDotProps {
  status: 'active' | 'inactive' | 'warning' | 'error'
  size?: 'small' | 'medium' | 'large'
}
```

### InputField
**Purpose**: Form input with consistent styling and validation

```typescript
interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}
```

### Tooltip
**Purpose**: Accessible tooltip with positioning options

```typescript
interface TooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: ComponentChildren
}
```

## Molecules (`webview-ui/src/components/molecules/`)

### ZoomControlStack
**Purpose**: Grouped zoom controls for graph interaction

```typescript
interface ZoomControlStackProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  disabled?: boolean
  buttonSize?: number
}
```

**Features:**
- Vertical stack layout with consistent spacing
- Accessibility group with proper ARIA labels
- Disabled state handling for all controls
- Customizable button sizing

### MiniMapPanel
**Purpose**: Mini-map visualization with viewport indicator

```typescript
interface MiniMapPanelProps {
  title?: string
  bounds?: Bounds | null
  viewport?: Bounds | null
}
```

**Features:**
- Viewport rectangle calculation and positioning
- Responsive scaling based on graph bounds
- Visual feedback for current view area
- Graceful handling of missing data

### MetricsInline
**Purpose**: Horizontal display of multiple metrics

```typescript
interface MetricsInlineProps {
  items: MetricItem[]
}

type MetricItem = { 
  variant: 'purple' | 'green' | 'neutral'
  text: string 
}
```

**Features:**
- Automatic separator insertion between items
- Consistent spacing and alignment
- Support for mixed metric types
- Responsive layout adaptation

### DataStatusCard
**Purpose**: Status display for data loading and errors

```typescript
interface DataStatusCardProps {
  status: 'loading' | 'error' | 'empty' | 'ready'
  title: string
  message?: string
  onRetry?: () => void
}
```

**Features:**
- Visual status indicators with appropriate icons
- Error state with retry functionality
- Loading animations and progress feedback
- Empty state messaging

### SearchBar
**Purpose**: Search input with filtering capabilities

```typescript
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
}
```

### SelectDropdown
**Purpose**: Dropdown selection with keyboard navigation

```typescript
interface SelectDropdownProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  placeholder?: string
}
```

## Composition Guidelines

### Component Creation Patterns

#### Atom Development
```typescript
// Template for new atoms
export function NewAtom({ prop1, prop2, ...rest }: NewAtomProps) {
  const className = ['atom-base', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  
  return (
    <element class={className} {...props}>
      {/* atom content */}
    </element>
  )
}
```

#### Molecule Development
```typescript
// Template for new molecules
export function NewMolecule({ atomProps, ...rest }: NewMoleculeProps) {
  return (
    <div class="molecule-container" {...rest}>
      <Atom1 {...atomProps.atom1} />
      <Atom2 {...atomProps.atom2} />
    </div>
  )
}
```

### Accessibility Standards

#### Required Attributes
- **ARIA Labels**: All interactive elements must have descriptive labels
- **Keyboard Navigation**: Tab order and keyboard event handling
- **Screen Reader Support**: Proper semantic markup and announcements
- **Focus Management**: Visible focus indicators and logical focus flow

#### Implementation Examples
```tsx
// Accessible button group
<div role="group" aria-label="Zoom controls">
  <ButtonIcon iconName="plus" ariaLabel="Zoom in" onClick={onZoomIn} />
  <ButtonIcon iconName="minus" ariaLabel="Zoom out" onClick={onZoomOut} />
</div>

// Accessible status display
<div role="status" aria-live="polite">
  <StatusDot status="active" />
  <span>System ready</span>
</div>
```

### Performance Considerations

#### Rendering Optimization
- **Memoization**: Use `useMemo` for expensive calculations
- **Event Handler Stability**: Stable references for event handlers
- **Conditional Rendering**: Efficient conditional display patterns
- **Lazy Loading**: Defer non-critical component loading

#### Memory Management
```typescript
// Proper cleanup in molecules
useEffect(() => {
  const cleanup = setupEventListeners()
  return () => {
    cleanup()
  }
}, [])
```

## Integration Patterns

### State Management
- **Local State**: Use `useState` for component-specific state
- **Shared State**: Use context or prop drilling for shared data
- **External State**: Integrate with messenger service for extension communication

### Event Handling
```typescript
// Consistent event handling pattern
interface ComponentProps {
  onAction: (data: ActionData) => void
  onError?: (error: Error) => void
}

// Implementation
const handleAction = useCallback((data: ActionData) => {
  try {
    onAction(data)
  } catch (error) {
    onError?.(error)
  }
}, [onAction, onError])
```

### Styling Conventions
- **CSS Classes**: BEM-style naming for component styles
- **CSS Variables**: Use CSS custom properties for theming
- **Responsive Design**: Mobile-first responsive patterns
- **Dark Mode**: Support for VS Code theme integration

## Testing Strategies

### Unit Testing
```typescript
// Example atom test
describe('ButtonIcon', () => {
  it('renders with correct accessibility attributes', () => {
    render(<ButtonIcon iconName="test" ariaLabel="Test button" onClick={jest.fn()} />)
    expect(screen.getByLabelText('Test button')).toBeInTheDocument()
  })
})
```

### Integration Testing
```typescript
// Example molecule test
describe('ZoomControlStack', () => {
  it('handles zoom interactions correctly', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onFit: jest.fn()
    }
    render(<ZoomControlStack {...handlers} />)
    
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(handlers.onZoomIn).toHaveBeenCalled()
  })
})
```

## Development Workflow

### Creating New Components

1. **Identify Component Type**: Determine if it's an atom, molecule, or organism
2. **Define Interface**: Create TypeScript interface with clear prop definitions
3. **Implement Component**: Follow composition patterns and accessibility guidelines
4. **Add Styling**: Create component-specific CSS with consistent naming
5. **Write Tests**: Unit tests for atoms, integration tests for molecules
6. **Document Usage**: Add examples and integration patterns

### Component Evolution
- **Atom → Molecule**: When atoms need to be combined for common use cases
- **Molecule → Organism**: When molecules need complex orchestration
- **Refactoring**: Extract common patterns into reusable atoms

### Code Review Checklist
- [ ] Proper TypeScript interfaces with clear prop definitions
- [ ] Accessibility attributes and keyboard navigation
- [ ] Consistent styling and responsive behavior
- [ ] Performance considerations (memoization, cleanup)
- [ ] Test coverage for key functionality
- [ ] Documentation and usage examples

## Future Enhancements

### Planned Additions
- **Animation Atoms**: Consistent animation and transition components
- **Form Molecules**: Complex form patterns with validation
- **Layout Organisms**: Advanced layout components with responsive behavior
- **Theme System**: Comprehensive theming with CSS custom properties

### Extension Points
- **Custom Atoms**: Plugin system for domain-specific atoms
- **Styling Variants**: Additional visual variants for existing components
- **Interaction Patterns**: New interaction patterns for graph visualization
- **Accessibility Enhancements**: Advanced accessibility features and testing