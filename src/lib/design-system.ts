/**
 * Design System Tokens
 * Based on Material Design 3 and Microsoft Fluent Design principles
 * 
 * This file contains all design tokens for consistent UI across the application
 */

// Brand Colors (Techvaults)
export const brandColors = {
  primary: '#bc0004',
  dark: '#000000',
  light: '#ffffff',
  gray: '#333333',
  grayLight: '#f5f5f5',
  grayBorder: '#e0e0e0',
} as const

// Semantic Colors (Material Design 3 inspired)
export const semanticColors = {
  // Success states
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Error/Danger states
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // Warning states
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Info states
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
} as const

// Neutral Colors (Fluent Design inspired)
export const neutralColors = {
  0: '#ffffff',
  4: '#fafafa',
  8: '#f5f5f5',
  12: '#f0f0f0',
  16: '#ebebeb',
  20: '#e0e0e0',
  30: '#d4d4d4',
  40: '#c2c2c2',
  50: '#a3a3a3',
  60: '#808080',
  70: '#666666',
  80: '#4d4d4d',
  90: '#333333',
  100: '#1a1a1a',
  110: '#0d0d0d',
  120: '#000000',
} as const

// Surface Colors (Material Design 3)
export const surfaceColors = {
  surface: neutralColors[0],
  surfaceContainer: neutralColors[8],
  surfaceContainerLow: neutralColors[4],
  surfaceContainerHigh: neutralColors[12],
  surfaceContainerHighest: neutralColors[16],
  surfaceDim: neutralColors[8],
  surfaceBright: neutralColors[0],
  surfaceVariant: neutralColors[4],
} as const

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const

// Spacing Scale (8px base unit)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const

// Elevation/Shadow System (Material Design)
export const elevation = {
  0: 'none',
  1: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
  2: '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)',
  3: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
  4: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
  5: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const

// Animation/Transitions
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  },
} as const

// Component Styles
export const componentStyles = {
  button: {
    primary: {
      base: 'inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2',
      background: brandColors.primary,
      hover: 'hover:opacity-90',
      active: 'active:opacity-80',
      focus: `focus:ring-${brandColors.primary}`,
    },
    secondary: {
      base: 'inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2',
      background: surfaceColors.surfaceContainer,
      text: neutralColors[90],
      hover: 'hover:bg-opacity-80',
    },
    outline: {
      base: 'inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2',
      border: brandColors.primary,
      text: brandColors.primary,
      hover: 'hover:bg-opacity-10',
    },
    ghost: {
      base: 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none',
      text: brandColors.primary,
      hover: 'hover:bg-opacity-10',
    },
  },
  input: {
    base: 'w-full px-4 py-3 text-sm border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
    border: neutralColors[20],
    borderFocus: brandColors.primary,
    background: surfaceColors.surface,
    placeholder: neutralColors[50],
  },
  card: {
    base: 'bg-white rounded-xl border transition-shadow duration-200',
    border: neutralColors[20],
    shadow: elevation[2],
    shadowHover: elevation[4],
  },
} as const

// Status Colors
export const statusColors = {
  success: semanticColors.success[600],
  error: semanticColors.error[600],
  warning: semanticColors.warning[600],
  info: semanticColors.info[600],
  pending: semanticColors.warning[500],
  approved: semanticColors.success[600],
  rejected: semanticColors.error[600],
  draft: neutralColors[60],
  submitted: semanticColors.info[500],
  underReview: semanticColors.warning[500],
  paid: '#9333ea', // Purple
  closed: neutralColors[70],
} as const

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const
