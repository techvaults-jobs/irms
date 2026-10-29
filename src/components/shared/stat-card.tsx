import { ReactNode } from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TONES = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  muted: 'bg-muted text-muted-foreground',
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: keyof typeof TONES
  hint?: ReactNode
  href?: string
  loading?: boolean
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, href, loading }: StatCardProps) {
  const content = (
    <Card className={cn('transition-colors', href && 'hover:border-primary/40 hover:bg-accent/40')}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : content
}
