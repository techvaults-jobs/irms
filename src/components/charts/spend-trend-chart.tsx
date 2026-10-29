'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/utils'

export interface SpendPoint {
  month: string // YYYY-MM
  approved: number
  paid: number
}

const SERIES = [
  { key: 'approved', label: 'Approved', color: 'hsl(var(--chart-2))' },
  { key: 'paid', label: 'Paid', color: 'hsl(var(--chart-1))' },
] as const

function monthLabel(key: string, long = false) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

/**
 * Fill in empty months so the x-axis spacing reflects real time.
 */
export function fillMonths(points: SpendPoint[], monthsBack: number): SpendPoint[] {
  const byMonth = new Map(points.map(p => [p.month, p]))
  const now = new Date()
  const result: SpendPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    result.push(byMonth.get(key) ?? { month: key, approved: 0, paid: 0 })
  }
  return result
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{monthLabel(label, true)}</p>
      {SERIES.map(series => {
        const item = payload.find((p: any) => p.dataKey === series.key)
        return (
          <div key={series.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: series.color }} />
              {series.label}
            </span>
            <span className="font-medium tabular-nums text-popover-foreground">{formatMoney(item?.value ?? 0)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function SpendTrendChart({ data }: { data: SpendPoint[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        {SERIES.map(series => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="h-64 w-full" role="img" aria-label="Approved versus paid spending by month">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map(series => (
                <linearGradient key={series.key} id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={value => monthLabel(value)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={value => formatMoney(value, 'NGN', { compact: true })}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '4 4' }} />
            {SERIES.map(series => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                fill={`url(#fill-${series.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
