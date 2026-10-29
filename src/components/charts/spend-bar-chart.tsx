'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/utils'

export interface SpendBarDatum {
  label: string
  estimated: number
  approved: number
  paid: number
  count: number
}

// Estimated is a neutral reference; approved/paid match the dashboard trend colors.
export const SPEND_SERIES = [
  { key: 'estimated', label: 'Estimated', color: 'hsl(var(--muted-foreground) / 0.45)' },
  { key: 'approved', label: 'Approved', color: 'hsl(var(--chart-2))' },
  { key: 'paid', label: 'Paid', color: 'hsl(var(--chart-1))' },
] as const

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const count = payload[0]?.payload?.count
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">
        {label}
        {count !== undefined && <span className="font-normal text-muted-foreground"> · {count} requisitions</span>}
      </p>
      {SPEND_SERIES.map(series => {
        const item = payload.find((p: any) => p.dataKey === series.key)
        return (
          <div key={series.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ background: series.color }} />
              {series.label}
            </span>
            <span className="font-medium tabular-nums text-popover-foreground">{formatMoney(item?.value ?? 0)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function SpendBarChart({ data, layout = 'horizontal' }: { data: SpendBarDatum[]; layout?: 'horizontal' | 'vertical' }) {
  const vertical = layout === 'vertical'
  const height = vertical ? Math.max(220, data.length * 44 + 40) : 300

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        {SPEND_SERIES.map(series => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div style={{ height }} className="w-full" role="img" aria-label="Estimated, approved and paid amounts">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={vertical ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap={vertical ? '22%' : '28%'}
          >
            <CartesianGrid horizontal={!vertical} vertical={vertical} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            {vertical ? (
              <>
                <XAxis type="number" tickFormatter={v => formatMoney(v, 'NGN', { compact: true })} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickMargin={8} />
                <YAxis tickFormatter={v => formatMoney(v, 'NGN', { compact: true })} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={64} />
              </>
            )}
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.6)' }} />
            {SPEND_SERIES.map(series => (
              <Bar
                key={series.key}
                dataKey={series.key}
                fill={series.color}
                radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                stroke="hsl(var(--background))"
                strokeWidth={1}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
