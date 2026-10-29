'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, formatMoney, toNumber } from '@/lib/utils'

interface FinancialSummaryProps {
  estimatedCost: string | number
  approvedCost?: string | number | null
  actualCostPaid?: string | number | null
  currency: string
  status: string
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentDate?: string | null
  paymentComment?: string | null
}

function paymentState(status: string) {
  if (status === 'PAID' || status === 'CLOSED') return { label: 'Paid', variant: 'success' as const }
  if (status === 'APPROVED') return { label: 'Awaiting payment', variant: 'warning' as const }
  if (status === 'REJECTED') return { label: 'Not payable', variant: 'danger' as const }
  return { label: 'Not yet approved', variant: 'muted' as const }
}

export function FinancialSummary({
  estimatedCost,
  approvedCost,
  actualCostPaid,
  currency,
  status,
  paymentMethod,
  paymentReference,
  paymentDate,
  paymentComment,
}: FinancialSummaryProps) {
  const estimated = toNumber(estimatedCost)
  const approved = approvedCost != null ? toNumber(approvedCost) : null
  const actual = actualCostPaid != null ? toNumber(actualCostPaid) : null
  const variance = approved !== null && actual !== null ? actual - approved : null
  const variancePct = variance !== null && approved ? (variance / approved) * 100 : null
  const scale = Math.max(estimated, approved ?? 0, actual ?? 0, 1)
  const payment = paymentState(status)

  const bars = [
    { label: 'Estimated', value: estimated, tone: 'bg-chart-2' },
    { label: 'Approved', value: approved, tone: 'bg-success' },
    { label: 'Paid', value: actual, tone: actual !== null && approved !== null && actual > approved ? 'bg-destructive' : 'bg-violet-500' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Cost breakdown</CardTitle>
          <CardDescription>From estimate to payment, on a shared scale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {bars.map(bar => (
            <div key={bar.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{bar.label}</span>
                <span className="font-medium tabular-nums">{bar.value === null ? '—' : formatMoney(bar.value, currency)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                {bar.value !== null && <div className={cn('h-full rounded-full', bar.tone)} style={{ width: `${(bar.value / scale) * 100}%` }} />}
              </div>
            </div>
          ))}

          {variance !== null && (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 text-sm',
                variance > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                {variance > 0 ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-success" />}
                {variance > 0 ? 'Over approved budget' : variance < 0 ? 'Under approved budget' : 'Exactly on budget'}
              </span>
              <span className="tabular-nums">
                {variance > 0 ? '+' : ''}
                {formatMoney(variance, currency)} ({variancePct !== null ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%` : '—'})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
          <CardDescription>
            <Badge variant={payment.variant}>{payment.label}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Method', value: paymentMethod },
              { label: 'Reference', value: paymentReference, mono: true },
              { label: 'Date', value: paymentDate ? formatDate(paymentDate) : null },
              { label: 'Note', value: paymentComment },
            ].map(row => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className={cn('text-right font-medium', row.mono && 'break-all font-mono text-xs')}>{row.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
