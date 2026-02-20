# Design System Documentation

## Overview
This design system is based on Material Design 3 and Microsoft Fluent Design principles, customized for the Techvaults IRMS application.

## Brand Colors

### Primary Brand Color
- **Primary Red**: `#bc0004` (brand-primary)
- Used for: Primary actions, links, accents, brand identity

### Neutral Colors
- **Black**: `#000000` (brand-dark)
- **White**: `#ffffff` (brand-light)
- **Gray Scale**: Various shades from `#f5f5f5` to `#333333`

## Semantic Colors

### Success (Green)
- Used for: Success messages, approved states, positive actions
- Primary: `#16a34a` (success-600)

### Error (Red)
- Used for: Error messages, rejected states, destructive actions
- Primary: `#dc2626` (error-600)

### Warning (Yellow/Orange)
- Used for: Warning messages, pending states, caution
- Primary: `#d97706` (warning-600)

### Info (Blue)
- Used for: Informational messages, neutral states
- Primary: `#2563eb` (info-600)

## Typography

### Font Families
- **Sans-serif**: System fonts (system-ui, -apple-system, Segoe UI, Roboto)
- **Monospace**: For code, references, IDs

### Font Sizes
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px
- 3xl: 30px
- 4xl: 36px

### Font Weights
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Spacing Scale
Based on 8px base unit:
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 6: 24px
- 8: 32px
- 12: 48px

## Border Radius
- sm: 4px
- md: 6px
- lg: 8px
- xl: 12px
- 2xl: 16px
- 3xl: 24px
- full: 9999px

## Elevation/Shadows
Material Design elevation system:
- 0: none
- 1: Subtle shadow for cards
- 2: Default card shadow
- 3: Elevated cards
- 4: Modals, dropdowns
- 5: High elevation elements

## Components

### Buttons

#### Primary Button
```tsx
<button className="btn-primary">
  Primary Action
</button>
```
- Background: brand-primary (#bc0004)
- Text: white
- Hover: opacity-90
- Focus: ring with brand-primary

#### Secondary Button
```tsx
<button className="btn-secondary">
  Secondary Action
</button>
```
- Background: gray-100
- Text: gray-900
- Hover: gray-200

#### Outline Button
```tsx
<button className="btn-outlined">
  Outline Action
</button>
```
- Border: brand-primary
- Text: brand-primary
- Hover: brand-primary/10 background

### Input Fields
```tsx
<input className="input-field" />
```
- Border: gray-300
- Focus: brand-primary ring
- Padding: px-4 py-3
- Border radius: lg (8px)

### Cards
```tsx
<div className="card">
  Card Content
</div>
```
- Background: white
- Border: gray-200
- Shadow: elevation-2
- Border radius: xl (12px)
- Padding: p-6

### Status Badges
- Success: `bg-success-100 text-success-700`
- Error: `bg-error-100 text-error-700`
- Warning: `bg-warning-100 text-warning-700`
- Info: `bg-info-100 text-info-700`

## Usage Guidelines

### Color Usage
1. **Primary actions**: Always use brand-primary (#bc0004)
2. **Success states**: Use success-600 (#16a34a)
3. **Error states**: Use error-600 (#dc2626)
4. **Neutral backgrounds**: Use gray-50 to gray-100
5. **Text**: Use gray-700 to gray-900 for readability

### Spacing
- Use consistent spacing scale (multiples of 4px/8px)
- Maintain visual rhythm with consistent gaps
- Use larger spacing for section separation

### Typography
- Use semibold (600) for headings and important text
- Use medium (500) for labels and emphasis
- Use normal (400) for body text
- Maintain consistent line heights (1.5 for body, 1.25 for headings)

### Accessibility
- Ensure sufficient color contrast (WCAG AA minimum)
- Use focus rings for keyboard navigation
- Provide clear visual feedback for interactions
- Use semantic HTML elements

## Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible layouts with grid and flexbox
- Touch-friendly targets (minimum 44x44px)

## Animation & Transitions
- Duration: 150-300ms for most interactions
- Easing: Standard cubic-bezier curves
- Hover states: Subtle scale or shadow changes
- Focus states: Ring animations

## Payment Reference Format
Auto-generated payment references follow the format:
`PAY-YYYYMMDD-HHMMSS-XXXX`
- Example: `PAY-20240220-143052-A1B2`
- Format ensures uniqueness and traceability
- Automatically generated on payment form load
