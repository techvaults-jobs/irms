'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Building2, CalendarRange, Download, FileSpreadsheet, Layers, ListChecks, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { RoleGate } from '@/components/shared/role-gate'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBreakdown } from '@/components/charts/status-breakdown'
import { SpendBarChart, SpendBarDatum } from '@/components/charts/spend-bar-chart'
import { endOfDay, formatDate, formatMoney, toNumber } from '@/lib/utils'

const REPORTS = [
  { id: 'monthly-spending', label: 'Monthly', icon: CalendarRange, title: 'Monthly spending', description: 'Estimated, approved and paid by month' },
  { id: 'category-spending', label: 'Category', icon: Layers, title: 'Spending by category', description: 'Where the money goes' },
  { id: 'department-spending', label: 'Department', icon: Building2, title: 'Spending by department', description: 'Department totals for the period' },
  { id: 'approval-status', label: 'Status', icon: ListChecks, title: 'Approval status', description: 'Requisitions by status for the period' },
  { id: 'pending-liabilities', label: 'Liabilities', icon: Wallet, title: 'Pending liabilities', description: 'Approved but not yet paid' },
] as const

type ReportId = (typeof REPORTS)[number]['id']

const PRESETS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '12 months', days: 365 },
  { label: 'Year to date', days: -1 },
]

function isoDaysAgo(days: number) {
  const date = new Date()
  if (days === -1) return `${date.getFullYear()}-01-01`
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function toSpendRows(report: ReportId, rows: any[]): SpendBarDatum[] {
  return rows.map(row => ({
    label: report === 'monthly-spending' ? monthLabel(row.month) : report === 'category-spending' ? row.category : row.departmentName,
    estimated: toNumber(row.estimatedTotal),
    approved: toNumber(row.approvedTotal),
    paid: toNumber(row.actualTotal),
    count: row.count ?? 0,
  }))
}

export default function ReportsPage() {
  return (
    <RoleGate roles={['MANAGER', 'FINANCE', 'ADMIN']}>
      <ReportsContent />
    </RoleGate>
  )
}

function ReportsContent() {
  const [report, setReport] = useState<ReportId>('monthly-spending')
  const [startDate, setStartDate] = useState(isoDaysAgo(365))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const meta = REPORTS.find(r => r.id === report)!
  const usesDates = report !== 'pending-liabilities'

  const load = useCallback(async () => {
    setRows(null)
    setError(null)
    try {
      const params = new URLSearchParams({ startDate, endDate: endOfDay(endDate) })
      const response = await fetch(`/api/reports/${report}?${params}`)
      if (!response.ok) throw new Error(response.status === 403 ? "You don't have permission to view this report" : 'Failed to load report')
      const data = await response.json()
      setRows(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
      setRows([])
    }
  }, [report, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const exportReport = (format: 'csv' | 'excel') => {
    const params = new URLSearchParams({ startDate, endDate: endOfDay(endDate), format })
    window.location.href = `/api/reports/${report}/export?${params}`
  }

  const spendRows = report === 'monthly-spending' || report === 'category-spending' || report === 'department-spending' ? toSpendRows(report, rows ?? []) : []
  const totals = spendRows.reduce(
    (acc, r) => ({ estimated: acc.estimated + r.estimated, approved: acc.approved + r.approved, paid: acc.paid + r.paid, count: acc.count + r.count }),
    { estimated: 0, approved: 0, paid: 0, count: 0 }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyse spending and approvals across the organisation."
        actions={
          report !== 'pending-liabilities' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportReport('csv')}>
                  <Download /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('excel')}>
                  <FileSpreadsheet /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <div className="flex flex-col gap-3">
        <Tabs value={report} onValueChange={v => setReport(v as ReportId)} className="max-w-full overflow-x-auto">
          <TabsList>
            {REPORTS.map(r => (
              <TabsTrigger key={r.id} value={r.id} className="gap-1.5">
                <r.icon className="h-3.5 w-3.5" />
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {usesDates && (
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map(preset => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant={startDate === isoDaysAgo(preset.days) ? 'secondary' : 'ghost'}
                  onClick={() => {
                    setStartDate(isoDaysAgo(preset.days))
                    setEndDate(new Date().toISOString().slice(0, 10))
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="start" className="text-xs text-muted-foreground">From</Label>
                <Input id="start" type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end" className="text-xs text-muted-foreground">To</Label>
                <Input id="end" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {spendRows.length > 0 || (rows === null && report !== 'approval-status' && report !== 'pending-liabilities') ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Requisitions" value={totals.count} icon={BarChart3} tone="primary" loading={rows === null} />
            <StatCard label="Estimated" value={formatMoney(totals.estimated, 'NGN', { compact: true })} icon={CalendarRange} tone="muted" loading={rows === null} />
            <StatCard label="Approved" value={formatMoney(totals.approved, 'NGN', { compact: true })} icon={ListChecks} tone="info" loading={rows === null} />
            <StatCard label="Paid" value={formatMoney(totals.paid, 'NGN', { compact: true })} icon={Wallet} tone="primary" loading={rows === null} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {rows === null ? <Skeleton className="h-72 w-full" /> : <SpendBarChart data={spendRows} layout={report === 'monthly-spending' ? 'horizontal' : 'vertical'} />}
            </CardContent>
          </Card>
          {rows !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">{report === 'monthly-spending' ? 'Month' : report === 'category-spending' ? 'Category' : 'Department'}</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Estimated</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="pr-6 text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spendRows.map(row => (
                      <TableRow key={row.label}>
                        <TableCell className="pl-6 font-medium">{row.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.estimated)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.approved)}</TableCell>
                        <TableCell className="pr-6 text-right tabular-nums">{formatMoney(row.paid)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="pl-6">Total</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(totals.estimated)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(totals.approved)}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">{formatMoney(totals.paid)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : report === 'approval-status' ? (
        <ApprovalStatusReport rows={rows} />
      ) : report === 'pending-liabilities' ? (
        <LiabilitiesReport rows={rows} />
      ) : (
        <EmptyState icon={BarChart3} title="No data for this period" description="Try a wider date range." />
      )}
    </div>
  )
}

function ApprovalStatusReport({ rows }: { rows: any[] | null }) {
  if (rows === null) return <Skeleton className="h-72 w-full" />
  const total = rows.reduce((sum, r) => sum + (r.count ?? 0), 0)
  if (total === 0) return <EmptyState icon={ListChecks} title="No requisitions in this period" description="Try a wider date range." />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Approval status</CardTitle>
        <CardDescription>{total} requisitions created in the period</CardDescription>
      </CardHeader>
      <CardContent>
        <StatusBreakdown counts={rows.map(r => ({ status: r.status, count: r.count }))} />
      </CardContent>
    </Card>
  )
}

function LiabilitiesReport({ rows }: { rows: any[] | null }) {
  if (rows === null) return <Skeleton className="h-72 w-full" />
  const total = rows.reduce((sum, r) => sum + toNumber(r.approvedCost), 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Awaiting payment" value={rows.length} icon={ListChecks} tone="warning" />
        <StatCard label="Total liability" value={formatMoney(total)} icon={Wallet} tone="primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved, unpaid requisitions</CardTitle>
          <CardDescription>Ordered by submission date</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title="No outstanding liabilities" description="Every approved requisition has been paid." className="mx-6" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Requisition</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="pr-6 text-right">Approved cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.requisitionId}>
                    <TableCell className="pl-6">
                      <Link href={`/requisitions/${row.requisitionId}`} className="font-medium hover:underline">
                        {row.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.departmentName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.submittedDate)}</TableCell>
                    <TableCell className="pr-6 text-right font-medium tabular-nums">{formatMoney(row.approvedCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
