import type { JSX } from 'preact'

interface IconProps {
  name: string
  size?: 16 | 20 | 24
  colorToken?: string
  title?: string
  'aria-hidden'?: boolean
}

// Simple SVG icon component with configurable size and color
export function Icon({ 
  name, 
  size = 20, 
  colorToken = '--text-secondary', 
  title,
  'aria-hidden': ariaHidden = true,
  ...rest 
}: IconProps & Omit<JSX.SVGAttributes<SVGSVGElement>, 'size'>) {
  const iconStyle = {
    width: `${size}px`,
    height: `${size}px`,
    color: `var(${colorToken})`,
    fill: 'currentColor',
    flexShrink: 0,
  }

  // For now, using VS Code codicons or simple geometric shapes
  // In a real implementation, this would map to actual SVG paths
  const getIconPath = (iconName: string) => {
    switch (iconName) {
      case 'search':
        return 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
      case 'chevron-down':
        return 'M7 10l5 5 5-5z'
      case 'chevron-right':
        return 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
      case 'clock':
        return 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z'
      case 'check':
        return 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
      case 'settings':
        return 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z'
      case 'plus':
        return 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
      case 'minus':
        return 'M19 13H5v-2h14v2z'
      case 'fullscreen':
        return 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'
      case 'arrow-right':
        return 'M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z'
      default:
        // Fallback: simple circle
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'
    }
  }

  return (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      aria-hidden={ariaHidden}
      {...(title && { 'aria-label': title })}
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={getIconPath(name)} />
    </svg>
  )
}