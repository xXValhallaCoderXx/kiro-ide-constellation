/**
 * Service for managing UI configuration and feature flags
 */

/**
 * UI configuration interface
 */
export interface UIConfig {
  toolbar: {
    searchEnabled: boolean
    fitEnabled: boolean
    resetEnabled: boolean
    layoutEnabled: boolean
    filtersEnabled: boolean
  }
}

/**
 * Default UI configuration for this iteration
 * All placeholder features are disabled
 */
export const DEFAULT_UI_CONFIG: UIConfig = {
  toolbar: {
    searchEnabled: false,    // Placeholder only
    fitEnabled: false,       // Placeholder only
    resetEnabled: false,     // Placeholder only
    layoutEnabled: false,    // Placeholder only
    filtersEnabled: false    // Placeholder only
  }
}

/**
 * Get current UI configuration
 * @returns Current UI configuration
 */
export function getUIConfig(): UIConfig {
  // For this iteration, return static config
  // Future iterations can add persistence/user preferences
  return DEFAULT_UI_CONFIG
}

/**
 * Check if a toolbar feature is enabled
 * @param feature - The toolbar feature to check
 * @returns Whether the feature is enabled
 */
export function isToolbarFeatureEnabled(feature: keyof UIConfig['toolbar']): boolean {
  const config = getUIConfig()
  return config.toolbar[feature]
}

/**
 * Get placeholder attributes for disabled controls
 * @param enabled - Whether the control is enabled
 * @returns Object with data attributes for disabled controls
 */
export function getPlaceholderAttributes(enabled: boolean) {
  if (enabled) {
    return {}
  }
  
  return {
    'data-placeholder': 'true',
    'aria-disabled': true,
    disabled: true
  }
}

/** Feature flags for optional UI elements */
export const OPTIONAL_UI_FLAGS = {
  zoomControlsEnabled: true,
  miniMapEnabled: true,
}
