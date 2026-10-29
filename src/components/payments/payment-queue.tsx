'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlarmClock, ArrowRight, Building2, HandCoins, PartyPopper, UserX, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { UserAvatar } from '@/components/shared/user-avatar'
import { payeeDisplayName } from './payee-summary'
import { dueState } from './payment-plan-card'
import { useAuth } from '@/hooks/useAuth'
import { paymentMethodLabel, pickPayeeDetails } from '@/lib/payment'
import { cn, formatMoney, toNumber } from '@/lib/utils'

interface PaymentItem {
  id: string
  title: string
  category: string
  status: string
  estimatedCost: string | number
  approvedCost?: string | number | null
  currency: string
  payeeType?: string | null
  payeeName?: string | null
  payeeAccountName?: string | null
  payeeBankName?: string | null
  approvedPaymentMethod?: string | null
  paymentDueDate?: string | null
  paymentAssigneeId?: string | null
  paymentAssignee?: { id: string; name: string } | null
  submitter?: { name: string }
  department?: { name: string }
}

type View = 'mine' | 'all' | 'unassigned'

// The queue is small (approved, unpaid), so load it in one go and filter locally
const MAX_ITEMS = 100

export function PaymentQueue() {
  const { user } = useAuth()
  const [items, setItems] = useState<PaymentItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('mine')

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/requisitions?status=APPROVED&sort=due_soonest&take=${MAX_ITEMS}`)
      if (!response.ok) throw new Error('Failed to load payments')
      const data = await response.json()
      setItems(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
      setItems([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const all = items ?? []
  const mine = all.filter(item => item.paymentAssigneeId === user?.id)
  const unassigned = all.filter(item => !item.paymentAssigneeId)
  const overdue = mine.filter(item => dueState(item.paymentDueDate, item.status)?.variant === 'danger')
  const visible = view === 'mine' ? mine : view === 'unassigned' ? unassigned : all

  // Totals per currency, since requisitions can be raised in several
  const totals = mine.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + toNumber(item.approvedCost ?? item.estimatedCost)
    return acc
  }, {})
  const totalLabel = Object.entries(totals).map(([currency, amount]) => formatMoney(amount, currency)).join(' + ') || formatMoney(0, 'NGN')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned to me" value={mine.length} icon={HandCoins} loading={items === null} />
        <StatCard label="Amount to pay" value={totalLabel} icon={Wallet} tone="violet" loading={items === null} />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={AlarmClock}
          tone={overdue.length ? 'warning' : 'muted'}
          hint={unassigned.length ? `${unassigned.length} approved without a payer` : undefined}
          loading={items === null}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={v => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="mine" className="gap-2">
              Assigned to me
              {items && (
                <Badge variant={mine.length ? 'default' : 'muted'} className="h-5 rounded-full px-1.5">
                  {mine.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All awaiting payment ({all.length})</TabsTrigger>
            {unassigned.length > 0 && <TabsTrigger value="unassigned">No payer ({unassigned.length})</TabsTrigger>}
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">Soonest due first</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={view === 'unassigned' ? UserX : PartyPopper}
          title={view === 'mine' ? 'No payments assigned to you' : 'Nothing awaiting payment'}
          description={view === 'mine' ? 'When an approver asks you to make a payment it will appear here.' : 'Approved requisitions will appear here until they are paid.'}
        />
      ) : (
        <div className="space-y-3">
          {visible.map(item => {
            const due = dueState(item.paymentDueDate, item.status)
            const isMine = item.paymentAssigneeId === user?.id
            const canPay = user?.role === 'ADMIN' || isMine || !item.paymentAssigneeId
            const payTo = payeeDisplayName(pickPayeeDetails(item), item.submitter?.name)
            return (
              <Card key={item.id} className={cn(isMine && 'border-primary/30', due?.variant === 'danger' && 'border-destructive/40')}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.approvedPaymentMethod ? (
                        <Badge variant="info">{paymentMethodLabel(item.approvedPaymentMethod)}</Badge>
                      ) : (
                        <Badge variant="muted">No method set</Badge>
                      )}
                      {due && <Badge variant={due.variant}>{due.label}</Badge>}
                    </div>
                    <Link href={`/requisitions/${item.id}`} className="block truncate text-lg font-semibold hover:underline">
                      {item.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        Pay to <span className="font-medium text-foreground">{payTo ?? 'not provided'}</span>
                        {item.payeeBankName && ` · ${item.payeeBankName}`}
                      </span>
                      {item.department?.name && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> {item.department.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        {item.paymentAssignee ? (
                          <>
                            <UserAvatar name={item.paymentAssignee.name} className="h-5 w-5" />
                            {isMine ? 'You' : item.paymentAssignee.name}
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" /> No payer assigned
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <p className="text-xl font-semibold tabular-nums">{formatMoney(item.approvedCost ?? item.estimatedCost, item.currency)}</p>
                    <Button size="sm" variant={canPay ? 'default' : 'outline'} asChild>
                      <Link href={`/requisitions/${item.id}${canPay ? '?tab=payment' : ''}`}>
                        {canPay ? 'Record payment' : 'View'} <ArrowRight />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
