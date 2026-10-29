'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowUpDown, Copy, Eye, FilePlus2, FileText, MoreHorizontal, Paperclip, Pencil, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatMoney } from '@/lib/utils'

interface Requisition {
  id: string
  title: string
  category: string
  status: string
  urgencyLevel: string
  estimatedCost: string | number
  currency: string
  createdAt: string
  submitter?: { name: string }
  department?: { name: string }
  _count?: { attachments: number }
}

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'UNDER_REVIEW', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
]

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
]

const PAGE_SIZE = 10

export function RequisitionList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const showSubmitter = user?.role !== 'STAFF'

  const status = searchParams.get('status') || 'ALL'
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [search, setSearch] = useState(searchInput)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Requisition[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchRows = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams({
      skip: String((page - 1) * PAGE_SIZE),
      take: String(PAGE_SIZE),
      sort,
    })
    if (status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)

    try {
      const response = await fetch(`/api/requisitions?${params}`)
      if (!response.ok) throw new Error('Failed to load requisitions')
      const data = await response.json()
      setRows(data.data ?? [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requisitions')
      setRows([])
    }
  }, [page, sort, status, search])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const setStatus = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') params.delete('status')
    else params.set('status', value)
    router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
    setPage(1)
  }

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id)
    toast.success('Requisition ID copied')
  }

  const hasFilters = status !== 'ALL' || !!search

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={setStatus} className="overflow-x-auto">
          <TabsList>
            {STATUS_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search title, category or ID…"
              className="pl-9 pr-8"
              aria-label="Search requisitions"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select
            value={sort}
            onValueChange={value => {
              setSort(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-44" aria-label="Sort">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[16rem]">Requisition</TableHead>
                {showSubmitter && <TableHead className="hidden lg:table-cell">Requested by</TableHead>}
                <TableHead className="hidden md:table-cell">Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Created</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-6">
                    <EmptyState
                      icon={FileText}
                      title={hasFilters ? 'No matching requisitions' : 'No requisitions yet'}
                      description={hasFilters ? 'Try a different status or search term.' : 'Create your first requisition to get started.'}
                      action={
                        hasFilters ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchInput('')
                              setStatus('ALL')
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : (
                          <Button size="sm" asChild>
                            <Link href="/requisitions/new">
                              <FilePlus2 /> New requisition
                            </Link>
                          </Button>
                        )
                      }
                      className="border-0"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(req => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => router.push(`/requisitions/${req.id}`)}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/requisitions/${req.id}`}
                          onClick={e => e.stopPropagation()}
                          className="font-medium hover:underline"
                        >
                          {req.title}
                        </Link>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {req.category}
                          {req.department?.name && <span>· {req.department.name}</span>}
                          {!!req._count?.attachments && (
                            <span className="flex items-center gap-0.5">
                              · <Paperclip className="h-3 w-3" />
                              {req._count.attachments}
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    {showSubmitter && (
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={req.submitter?.name} className="h-6 w-6" />
                          <span className="truncate text-sm">{req.submitter?.name ?? '—'}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge kind="urgency" value={req.urgencyLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={req.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(req.estimatedCost, req.currency)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{formatDate(req.createdAt)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/requisitions/${req.id}`}>
                              <Eye /> View details
                            </Link>
                          </DropdownMenuItem>
                          {user?.role === 'ADMIN' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/requisitions/${req.id}/edit`}>
                                <Pencil /> Edit
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copyId(req.id)}>
                            <Copy /> Copy ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="requisitions" />
    </div>
  )
}
