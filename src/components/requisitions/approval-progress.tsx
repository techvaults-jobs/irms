import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { cn, formatDate, humanize } from '@/lib/utils'

export interface ApprovalStepView {
  id: string
  stepNumber: number
  requiredRole: string
  status: string
  approverComment?: string | null
  approvedAt?: string | null
  assignedUser?: { name: string } | null
}

const STYLES: Record<string, { icon: typeof Circle; ring: string; line: string }> = {
  APPROVED: { icon: CheckCircle2, ring: 'border-success/40 bg-success/10 text-success', line: 'bg-success/50' },
  REJECTED: { icon: XCircle, ring: 'border-destructive/40 bg-destructive/10 text-destructive', line: 'bg-border' },
  PENDING: { icon: Clock, ring: 'border-warning/40 bg-warning/10 text-warning', line: 'bg-border' },
}

export function ApprovalProgress({ steps, orientation = 'vertical' }: { steps: ApprovalStepView[]; orientation?: 'vertical' | 'horizontal' }) {
  const firstPending = steps.find(s => s.status === 'PENDING')?.id

  if (orientation === 'horizontal') {
    return (
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const style = STYLES[step.status] ?? STYLES.PENDING
          const waiting = step.status === 'PENDING' && step.id !== firstPending
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', waiting ? 'text-muted-foreground' : style.ring)}>
                  {waiting ? <Circle className="h-3.5 w-3.5" /> : <style.icon className="h-3.5 w-3.5" />}
                </div>
                <span className="truncate text-xs font-medium">{humanize(step.requiredRole)}</span>
              </div>
              {index < steps.length - 1 && <div className={cn('h-px flex-1', style.line)} />}
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <ol>
      {steps.map((step, index) => {
        const style = STYLES[step.status] ?? STYLES.PENDING
        const waiting = step.status === 'PENDING' && step.id !== firstPending
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', waiting ? 'text-muted-foreground' : style.ring)}>
                {waiting ? <Circle className="h-4 w-4" /> : <style.icon className="h-4 w-4" />}
              </div>
              {index < steps.length - 1 && <div className={cn('my-1 w-px flex-1', style.line)} />}
            </div>
            <div className="min-w-0 flex-1 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <p className="text-sm font-medium">
                  Step {step.stepNumber} · {humanize(step.requiredRole)}
                </p>
                <span className="text-xs text-muted-foreground">
                  {step.status === 'PENDING' ? (waiting ? 'Waiting' : 'In progress') : `${humanize(step.status)} ${step.approvedAt ? formatDate(step.approvedAt) : ''}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{step.assignedUser?.name ?? `Any ${humanize(step.requiredRole).toLowerCase()}`}</p>
              {step.approverComment && (
                <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm">&ldquo;{step.approverComment}&rdquo;</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
