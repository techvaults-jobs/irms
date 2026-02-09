import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Techvaults Brand Colors
        brand: {
          primary: '#bc0004', // Main brand red
          dark: '#000000',    // Black
          light: '#ffffff',   // White
          gray: '#333333',    // Dark gray
          'gray-light': '#f5f5f5', // Light gray
          'gray-border': '#e0e0e0', // Border gray
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        'md-1': '0px 2px 4px rgba(0, 0, 0, 0.08)',
        'md-2': '0px 4px 8px rgba(0, 0, 0, 0.12)',
        'md-3': '0px 8px 16px rgba(0, 0, 0, 0.16)',
        'md-4': '0px 12px 24px rgba(0, 0, 0, 0.20)',
      },
      borderRadius: {
        'md-sm': '4px',
        'md-md': '8px',
        'md-lg': '12px',
        'md-xl': '16px',
      },
      spacing: {
        'md-xs': '4px',
        'md-sm': '8px',
        'md-md': '16px',
        'md-lg': '24px',
        'md-xl': '32px',
      },
    },
  },
  plugins: [],
}
export default config
