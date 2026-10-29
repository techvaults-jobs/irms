import {
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  FileCheck2,
  Flame,
  LucideIcon,
  Send,
  ShieldCheck,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Wallet,
  XCircle,
  UserCheck,
  UserX,
  Hourglass,
  Briefcase,
  Calculator,
  User,
} from 'lucide-react'
import type { BadgeProps } from '@/components/ui/badge'

type Variant = NonNullable<BadgeProps['variant']>

interface StatusMeta {
  label: string
  variant: Variant
  icon: LucideIcon
  description?: string
}

export const REQUISITION_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Draft', variant: 'muted', icon: CircleDashed, description: 'Not yet submitted' },
  SUBMITTED: { label: 'Submitted', variant: 'info', icon: Send, description: 'Awaiting review' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'warning', icon: Eye, description: 'In the approval chain' },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2, description: 'Ready for payment' },
  REJECTED: { label: 'Rejected', variant: 'danger', icon: XCircle, description: 'Declined by an approver' },
  PAID: { label: 'Paid', variant: 'violet', icon: Wallet, description: 'Payment recorded' },
  CLOSED: { label: 'Closed', variant: 'outline', icon: FileCheck2, description: 'Completed' },
}

export const REQUISITION_STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED']

export const URGENCY: Record<string, StatusMeta> = {
  LOW: { label: 'Low', variant: 'muted', icon: SignalLow },
  MEDIUM: { label: 'Medium', variant: 'info', icon: SignalMedium },
  HIGH: { label: 'High', variant: 'warning', icon: SignalHigh },
  CRITICAL: { label: 'Critical', variant: 'danger', icon: Flame },
}

export const STEP_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', variant: 'danger', icon: XCircle },
  SKIPPED: { label: 'Skipped', variant: 'muted', icon: Ban },
}

export const ACCOUNT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending approval', variant: 'warning', icon: Hourglass },
  APPROVED: { label: 'Approved', variant: 'success', icon: UserCheck },
  REJECTED: { label: 'Rejected', variant: 'danger', icon: UserX },
}

export const ROLES: Record<string, StatusMeta> = {
  STAFF: { label: 'Staff', variant: 'muted', icon: User, description: 'Creates and tracks own requisitions' },
  MANAGER: { label: 'Manager', variant: 'info', icon: Briefcase, description: 'Approves department requisitions' },
  FINANCE: { label: 'Finance', variant: 'success', icon: Calculator, description: 'Approves budgets and records payments' },
  ADMIN: { label: 'Admin', variant: 'danger', icon: ShieldCheck, description: 'Full access, manages users and rules' },
}

export const ROLE_ORDER = ['STAFF', 'MANAGER', 'FINANCE', 'ADMIN']

export function statusMeta(map: Record<string, StatusMeta>, key: string | null | undefined): StatusMeta {
  return (key && map[key]) || { label: key ? key.replace(/_/g, ' ') : 'Unknown', variant: 'outline', icon: CircleDashed }
}
