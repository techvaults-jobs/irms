'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pl-9 pr-10', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'

const CHECKS = [
  { label: '8+ characters', test: (v: string) => v.length >= 8 },
  { label: 'A letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { label: 'A number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'A symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

const LEVELS = [
  { label: 'Too weak', bar: 'bg-destructive' },
  { label: 'Weak', bar: 'bg-destructive' },
  { label: 'Fair', bar: 'bg-warning' },
  { label: 'Good', bar: 'bg-success' },
  { label: 'Strong', bar: 'bg-success' },
]

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  const score = CHECKS.filter(check => check.test(value)).length
  const level = LEVELS[score]

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full bg-muted', i < score && level.bar)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{level.label}</span>
        {CHECKS.map(check => (
          <span key={check.label} className={cn(check.test(value) && 'text-success')}>
            {check.test(value) ? '✓' : '·'} {check.label}
          </span>
        ))}
      </div>
    </div>
  )
}
