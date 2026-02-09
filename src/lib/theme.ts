/**
 * TechVaults Material Design Theme
 * Brand Colors: Red (#FF3333) and Dark Gray (#4b5563)
 */

export const theme = {
  colors: {
    primary: '#FF3333',
    primaryLight: '#ff6666',
    primaryDark: '#cc2929',
    secondary: '#4b5563',
    secondaryLight: '#6b7280',
    secondaryDark: '#1f2937',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#f5f5f5',
    surface: '#ffffff',
    border: '#e5e7eb',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0px 2px 4px rgba(0, 0, 0, 0.08)',
    md: '0px 4px 8px rgba(0, 0, 0, 0.12)',
    lg: '0px 8px 16px rgba(0, 0, 0, 0.16)',
    xl: '0px 12px 24px rgba(0, 0, 0, 0.20)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
} as const

export type Theme = typeof theme
