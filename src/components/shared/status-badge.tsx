import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ACCOUNT_STATUS,
  REQUISITION_STATUS,
  ROLES,
  STEP_STATUS,
  URGENCY,
  statusMeta,
} from '@/lib/status'

const MAPS = {
  requisition: REQUISITION_STATUS,
  urgency: URGENCY,
  step: STEP_STATUS,
  account: ACCOUNT_STATUS,
  role: ROLES,
}

interface StatusBadgeProps {
  value: string | null | undefined
  kind?: keyof typeof MAPS
  className?: string
  hideIcon?: boolean
}

export function StatusBadge({ value, kind = 'requisition', className, hideIcon }: StatusBadgeProps) {
  const meta = statusMeta(MAPS[kind], value)
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant} className={cn('gap-1 whitespace-nowrap font-medium', className)}>
      {!hideIcon && <Icon className="h-3 w-3" aria-hidden />}
      {meta.label}
    </Badge>
  )
}
