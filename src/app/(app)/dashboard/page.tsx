'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  CircleDashed,
  Clock,
  FilePlus2,
  FileText,
  PieChart,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { SpendTrendChart, SpendPoint, fillMonths } from '@/components/charts/spend-trend-chart'
import { StatusBreakdown } from '@/components/charts/status-breakdown'
import { useAuth } from '@/hooks/useAuth'
import { endOfDay, formatDate, formatMoney, toNumber } from '@/lib/utils'

interface DashboardStats {
  totalRequisitions: number
  draftCount: number
  submittedCount: number
  underReviewCount: number
  approvedCount: number
  rejectedCount: number
  paidCount: number
  closedCount: number
  totalSpent: number | string
  totalApproved: number | string
  totalEstimated: number | string
  pendingApprovalsCount: number
}

interface RecentRequisition {
  id: string
  title: string
  status: string
  estimatedCost: string | number
  currency: string
  createdAt: string
  submitter?: { name: string }
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<RecentRequisition[] | null>(null)
  const [trend, setTrend] = useState<SpendPoint[] | null>(null)
  const [pendingUsers, setPendingUsers] = useState(0)

  const canReport = user?.role === 'MANAGER' || user?.role === 'FINANCE' || user?.role === 'ADMIN'
  const isApprover = canReport

  useEffect(() => {
    if (!user) return

    fetch('/api/dashboard/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null))

    fetch('/api/requisitions?take=6')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setRecent(data?.data ?? []))
      .catch(() => setRecent([]))

    if (canReport) {
      const start = new Date()
      start.setMonth(start.getMonth() - 5, 1)
      // A bare YYYY-MM-DD end date parses as midnight and would drop today's records
      const params = new URLSearchParams({ startDate: start.toISOString().slice(0, 10), endDate: endOfDay(new Date().toISOString().slice(0, 10)) })
      fetch(`/api/reports/monthly-spending?${params}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          const points: SpendPoint[] = (data?.data ?? []).map((row: any) => ({
            month: row.month,
            approved: toNumber(row.approvedTotal),
            paid: toNumber(row.actualTotal),
          }))
          setTrend(fillMonths(points, 6))
        })
        .catch(() => setTrend(fillMonths([], 6)))
    }

    if (user.role === 'ADMIN') {
      fetch('/api/users/stats')
        .then(r => (r.ok ? r.json() : null))
        .then(data => setPendingUsers(data?.pending ?? 0))
        .catch(() => {})
    }
  }, [user, canReport])

  const loading = stats === null
  const totalApproved = toNumber(stats?.totalApproved)
  const totalSpent = toNumber(stats?.totalSpent)
  const outstanding = Math.max(0, totalApproved - totalSpent)
  const inReview = (stats?.submittedCount ?? 0) + (stats?.underReviewCount ?? 0)

  const statusCounts = stats
    ? [
        { status: 'DRAFT', count: stats.draftCount },
        { status: 'UNDER_REVIEW', count: inReview },
        { status: 'APPROVED', count: stats.approvedCount },
        { status: 'PAID', count: stats.paidCount },
        { status: 'REJECTED', count: stats.rejectedCount },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here's what's happening with your requisitions."
        actions={
          <>
            {isApprover && (
              <Button variant="outline" asChild>
                <Link href="/approvals">
                  <CheckSquare /> Review approvals
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/requisitions/new">
                <FilePlus2 /> New requisition
              </Link>
            </Button>
          </>
        }
      />

      {pendingUsers > 0 && (
        <Alert className="border-warning/30 bg-warning/5">
          <UserPlus className="h-4 w-4 !text-warning" />
          <AlertTitle>
            {pendingUsers} account request{pendingUsers === 1 ? '' : 's'} waiting for review
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            New staff can&apos;t sign in until you approve them.
            <Button size="sm" variant="outline" asChild>
              <Link href="/users?tab=pending">
                Review requests <ArrowRight />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total requisitions"
          value={stats?.totalRequisitions ?? 0}
          icon={FileText}
          tone="primary"
          hint={`${stats?.draftCount ?? 0} in draft`}
          href="/requisitions"
          loading={loading}
        />
        <StatCard
          label={isApprover ? 'Awaiting approval' : 'In review'}
          value={isApprover ? stats?.pendingApprovalsCount ?? 0 : inReview}
          icon={Clock}
          tone="warning"
          hint={isApprover ? 'Across your scope' : 'Moving through approvals'}
          href={isApprover ? '/approvals' : '/requisitions?status=UNDER_REVIEW'}
          loading={loading}
        />
        <StatCard
          label="Approved budget"
          value={formatMoney(totalApproved, 'NGN', { compact: true })}
          icon={CheckCircle2}
          tone="success"
          hint={`${stats?.approvedCount ?? 0} awaiting payment`}
          loading={loading}
        />
        <StatCard
          label="Paid out"
          value={formatMoney(totalSpent, 'NGN', { compact: true })}
          icon={Wallet}
          tone="violet"
          hint={`${formatMoney(outstanding, 'NGN', { compact: true })} outstanding`}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">{canReport ? 'Spending trend' : 'Recent requisitions'}</CardTitle>
              <CardDescription>
                {canReport ? 'Approved vs. paid over the last 6 months' : 'Your latest requests and their status'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={canReport ? '/reports' : '/requisitions'}>
                {canReport ? <PieChart /> : null}
                {canReport ? 'Reports' : 'View all'}
                {!canReport && <ArrowRight />}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {canReport ? (
              trend ? <SpendTrendChart data={trend} /> : <Skeleton className="h-72 w-full" />
            ) : (
              <RecentTable rows={recent} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status breakdown</CardTitle>
            <CardDescription>Where your requisitions are right now</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats.totalRequisitions === 0 ? (
              <EmptyState icon={CircleDashed} title="Nothing yet" description="Create a requisition to see it here." className="py-8" />
            ) : (
              <StatusBreakdown counts={statusCounts} />
            )}
          </CardContent>
        </Card>
      </div>

      {canReport && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Recent requisitions</CardTitle>
              <CardDescription>Latest activity across your scope</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/requisitions">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentTable rows={recent} showSubmitter />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RecentTable({ rows, showSubmitter }: { rows: RecentRequisition[] | null; showSubmitter?: boolean }) {
  if (rows === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No requisitions yet"
        description="Your requisitions will show up here."
        action={
          <Button asChild size="sm">
            <Link href="/requisitions/new">
              <FilePlus2 /> Create one
            </Link>
          </Button>
        }
        className="py-8"
      />
    )
  }

  return (
    <div className="-mx-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Title</TableHead>
            {showSubmitter && <TableHead className="hidden md:table-cell">Requested by</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden pr-6 text-right sm:table-cell">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id} className="cursor-pointer">
              <TableCell className="max-w-[16rem] pl-6">
                <Link href={`/requisitions/${row.id}`} className="block truncate font-medium hover:underline">
                  {row.title}
                </Link>
              </TableCell>
              {showSubmitter && <TableCell className="hidden text-muted-foreground md:table-cell">{row.submitter?.name ?? '—'}</TableCell>}
              <TableCell>
                <StatusBadge value={row.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.estimatedCost, row.currency)}</TableCell>
              <TableCell className="hidden pr-6 text-right text-muted-foreground sm:table-cell">{formatDate(row.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
