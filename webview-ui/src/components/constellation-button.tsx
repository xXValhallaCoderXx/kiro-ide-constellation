import type { ComponentChildren } from 'preact'
import type { JSX } from 'preact'
import { Icon, type IconName } from './atoms/Icon'

interface ConstellationButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'type'> {
  children?: ComponentChildren
  icon?: IconName
  label: string
  onClick?: (e?: MouseEvent) => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
}

export function ConstellationButton({ 
  children, 
  icon,
  label,
  onClick, 
  type = 'button',
  variant = 'primary',
  size = 'md',
  ...rest 
}: ConstellationButtonProps) {
  // Allow callers to provide `class` (Preact) or `className` (JSX typing) variants.
  // We merge with the base .button to preserve existing styling.
  const cls = ((rest as any).class ?? (rest as any).className ?? '').toString().trim()
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost'
  const sizeClass = size === 'sm' ? 'btn-sm' : 'btn-md'
  
  const merged = ['button', 'btn', 'constellation-btn', variantClass, sizeClass, cls].filter(Boolean).join(' ')
  
  const props = { ...rest } as any
  delete props.className
  
  return (
    <button 
      class={merged} 
      type={type} 
      onClick={onClick as any} 
      aria-label={label}
      title={label}
      {...props}
    >
      {icon && (
        <Icon 
          name={icon} 
          size={size === 'sm' ? 16 : 20} 
          colorToken="currentColor"
        />
      )}
      {children || label}
    </button>
  )
}
