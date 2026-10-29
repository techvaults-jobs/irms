import Link from 'next/link'
import { REQUISITION_STATUS, statusMeta } from '@/lib/status'
import { cn } from '@/lib/utils'

const BAR_TONE: Record<string, string> = {
  muted: 'bg-muted-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
  violet: 'bg-violet-500',
  outline: 'bg-foreground/60',
}

interface StatusBreakdownProps {
  counts: { status: string; count: number }[]
}

/**
 * Labeled horizontal bars: identity comes from the icon + label,
 * the value is printed, so color is never the only cue.
 */
export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  const max = Math.max(1, ...counts.map(c => c.count))
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  return (
    <ul className="space-y-3">
      {counts.map(({ status, count }) => {
        const meta = statusMeta(REQUISITION_STATUS, status)
        const pct = total ? Math.round((count / total) * 100) : 0
        return (
          <li key={status}>
            <Link
              href={`/requisitions?status=${status}`}
              className="group block rounded-md px-1 py-0.5 transition-colors hover:bg-accent/50"
              title={`${meta.label}: ${count} (${pct}%)`}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <meta.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {meta.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{count}</span> · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', BAR_TONE[meta.variant])}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
