'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, CalendarDays, CheckSquare, Paperclip, PartyPopper } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { ApprovalProgress, ApprovalStepView } from '@/components/requisitions/approval-progress'
import { ApprovalActions } from './ApprovalActions'
import { useAuth } from '@/hooks/useAuth'
import { formatMoney, formatRelative, humanize } from '@/lib/utils'

interface QueueItem {
  id: string
  title: string
  category: string
  estimatedCost: string | number
  currency: string
  urgencyLevel: string
  status: string
  createdAt: string
  submitter?: { name: string; email: string }
  department?: { name: string }
  approvalSteps?: (ApprovalStepView & { assignedUserId?: string | null })[]
  _count?: { attachments: number }
}

const PAGE_SIZE = 10
const URGENCY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export function ApprovalQueue() {
  const { user } = useAuth()
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'mine' | 'all'>('mine')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams({
        status: 'UNDER_REVIEW',
        skip: String((page - 1) * PAGE_SIZE),
        take: String(PAGE_SIZE),
        sort: 'oldest',
      })
      const response = await fetch(`/api/requisitions?${params}`)
      if (!response.ok) throw new Error('Failed to load approval queue')
      const data = await response.json()
      setItems(data.data ?? [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval queue')
      setItems([])
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const isMyTurn = (item: QueueItem) => {
    const next = item.approvalSteps?.find(step => step.status === 'PENDING')
    if (!next) return false
    if (user?.role === 'ADMIN') return true
    return next.assignedUserId === user?.id || (!next.assignedUserId && next.requiredRole === user?.role)
  }

  const sorted = [...(items ?? [])].sort(
    (a, b) => (URGENCY_RANK[a.urgencyLevel] ?? 9) - (URGENCY_RANK[b.urgencyLevel] ?? 9)
  )
  const mine = sorted.filter(isMyTurn)
  const visible = view === 'mine' ? mine : sorted

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={v => setView(v as 'mine' | 'all')}>
          <TabsList>
            <TabsTrigger value="mine" className="gap-2">
              Needs my action
              {items && (
                <Badge variant={mine.length ? 'default' : 'muted'} className="h-5 rounded-full px-1.5">
                  {mine.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All in review ({total})</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">Sorted by urgency, oldest first</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={view === 'mine' ? PartyPopper : CheckSquare}
          title={view === 'mine' ? "You're all caught up" : 'Nothing in review'}
          description={view === 'mine' ? 'No requisitions are waiting on your approval right now.' : 'Submitted requisitions will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {visible.map(item => {
            const steps = item.approvalSteps ?? []
            const next = steps.find(step => step.status === 'PENDING')
            const myTurn = isMyTurn(item)
            return (
              <Card key={item.id} className={myTurn ? 'border-primary/30' : undefined}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge kind="urgency" value={item.urgencyLevel} />
                        {myTurn ? (
                          <Badge>Your turn</Badge>
                        ) : (
                          next && <Badge variant="muted">Waiting on {humanize(next.requiredRole)}</Badge>
                        )}
                      </div>
                      <Link href={`/requisitions/${item.id}`} className="block text-lg font-semibold hover:underline">
                        {item.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <UserAvatar name={item.submitter?.name} className="h-5 w-5" />
                          {item.submitter?.name}
                        </span>
                        {item.department?.name && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" /> {item.department.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatRelative(item.createdAt)}
                        </span>
                        {!!item._count?.attachments && (
                          <span className="flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5" /> {item._count.attachments}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-semibold tabular-nums">{formatMoney(item.estimatedCost, item.currency)}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>

                  {steps.length > 0 && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <ApprovalProgress steps={steps} orientation="horizontal" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 self-start">
                      <Link href={`/requisitions/${item.id}`}>
                        View full details <ArrowRight />
                      </Link>
                    </Button>
                    {myTurn && (
                      <div className="sm:w-64">
                        <ApprovalActions requisitionId={item.id} requisitionTitle={item.title} steps={steps} compact onSuccess={load} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {total > PAGE_SIZE && <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="requisitions" />}
    </div>
  )
}
