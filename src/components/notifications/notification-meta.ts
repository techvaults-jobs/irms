import { Bell, CheckCircle2, Clock, LucideIcon, Send, Wallet, XCircle } from 'lucide-react'

export const NOTIFICATION_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  SUBMITTED: { label: 'Submitted', icon: Send, tone: 'bg-info/10 text-info' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, tone: 'bg-success/10 text-success' },
  REJECTED: { label: 'Rejected', icon: XCircle, tone: 'bg-destructive/10 text-destructive' },
  PAID: { label: 'Paid', icon: Wallet, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  REMINDER: { label: 'Reminder', icon: Clock, tone: 'bg-warning/10 text-warning' },
}

export function notificationMeta(type: string) {
  return NOTIFICATION_META[type] ?? { label: 'Update', icon: Bell, tone: 'bg-muted text-muted-foreground' }
}
