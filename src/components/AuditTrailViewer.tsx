'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  History,
  Lock,
  LucideIcon,
  Pencil,
  RefreshCw,
  Sparkles,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { UserAvatar } from '@/components/shared/user-avatar'
import { cn, formatDate, formatRelative, humanize } from '@/lib/utils'

interface AuditEntry {
  id: string
  changeType: string
  fieldName?: string | null
  previousValue?: string | null
  newValue?: string | null
  timestamp: string
  user?: { name: string; email: string }
  metadata?: Record<string, any> | string | null
}

const TYPE_META: Record<string, { icon: LucideIcon; tone: string; verb: string }> = {
  CREATED: { icon: Sparkles, tone: 'bg-info/10 text-info', verb: 'created the requisition' },
  FIELD_UPDATED: { icon: Pencil, tone: 'bg-muted text-muted-foreground', verb: 'updated' },
  STATUS_CHANGED: { icon: RefreshCw, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', verb: 'changed the status' },
  APPROVED: { icon: CheckCircle2, tone: 'bg-success/10 text-success', verb: 'approved' },
  REJECTED: { icon: XCircle, tone: 'bg-destructive/10 text-destructive', verb: 'rejected' },
  PAYMENT_RECORDED: { icon: Wallet, tone: 'bg-warning/10 text-warning', verb: 'recorded a payment' },
  ATTACHMENT_UPLOADED: { icon: Upload, tone: 'bg-info/10 text-info', verb: 'uploaded an attachment' },
  ATTACHMENT_DOWNLOADED: { icon: Download, tone: 'bg-muted text-muted-foreground', verb: 'downloaded an attachment' },
  NOTIFICATION_SENT: { icon: Bell, tone: 'bg-muted text-muted-foreground', verb: 'sent a notification' },
}

function formatValue(value?: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)
  } catch {
    return value
  }
}

function summary(entry: AuditEntry) {
  const meta = TYPE_META[entry.changeType]
  if (entry.changeType === 'STATUS_CHANGED') {
    const from = formatValue(entry.previousValue)
    const to = formatValue(entry.newValue)
    if (from && to) return `moved status from ${humanize(from)} to ${humanize(to)}`
  }
  if (entry.changeType === 'FIELD_UPDATED' && entry.fieldName) return `updated ${entry.fieldName}`
  return meta?.verb ?? humanize(entry.changeType).toLowerCase()
}

export function AuditTrailViewer({ requisitionId }: { requisitionId: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch(`/api/requisitions/${requisitionId}/audit-trail`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load activity')
        return r.json()
      })
      .then(data => setEntries(data.data ?? []))
      .catch(err => {
        setError(err.message)
        setEntries([])
      })
  }, [requisitionId])

  const types = Array.from(new Set((entries ?? []).map(e => e.changeType)))
  const visible = (entries ?? []).filter(e => filter === 'ALL' || e.changeType === filter)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Activity
          </CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> Immutable audit trail of every change
          </CardDescription>
        </div>
        {types.length > 1 && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All activity ({entries?.length ?? 0})</SelectItem>
              {types.map(type => (
                <SelectItem key={type} value={type}>
                  {humanize(type)} ({entries?.filter(e => e.changeType === type).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {entries === null ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : visible.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" className="py-8" />
        ) : (
          <ol>
            {visible.map((entry, index) => {
              const meta = TYPE_META[entry.changeType] ?? { icon: History, tone: 'bg-muted text-muted-foreground' }
              const previous = formatValue(entry.previousValue)
              const next = formatValue(entry.newValue)
              const metadata = typeof entry.metadata === 'string' ? formatValue(entry.metadata) : entry.metadata ? JSON.stringify(entry.metadata, null, 2) : null
              const hasDetails = !!(previous || next || metadata)

              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.tone)}>
                      <meta.icon className="h-4 w-4" />
                    </div>
                    {index < visible.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                  </div>
                  <Collapsible className="min-w-0 flex-1 pb-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <UserAvatar name={entry.user?.name} className="h-5 w-5" />
                      <span className="font-medium">{entry.user?.name ?? 'System'}</span>
                      <span className="text-muted-foreground">{summary(entry)}</span>
                      <span className="text-xs text-muted-foreground" title={formatDate(entry.timestamp, true)}>
                        · {formatRelative(entry.timestamp)}
                      </span>
                      {hasDetails && (
                        <CollapsibleTrigger className="group ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          Details
                          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {hasDetails && (
                      <CollapsibleContent className="mt-2 space-y-2 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        {previous && (
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-destructive/5 p-2 font-mono text-xs">{previous}</pre>
                          </div>
                        )}
                        {next && (
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-success/5 p-2 font-mono text-xs">{next}</pre>
                          </div>
                        )}
                        {metadata && (
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Metadata</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono text-xs">{metadata}</pre>
                          </div>
                        )}
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {entry.id} · {formatDate(entry.timestamp, true)}
                        </p>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
