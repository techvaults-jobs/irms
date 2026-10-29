'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Briefcase,
  Building2,
  Check,
  Clock,
  Filter,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserAvatar } from '@/components/shared/user-avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ApproveUserDialog, Department, ManagedUser, RejectUserDialog, UserFormDialog } from '@/components/users/user-dialogs'
import { useAuth } from '@/hooks/useAuth'
import { notifyCountsChanged } from '@/hooks/useNavCounts'
import { ROLES, ROLE_ORDER } from '@/lib/status'
import { apiFetch, formatDate, formatRelative } from '@/lib/utils'

type Tab = 'pending' | 'members' | 'rejected'
const TAB_STATUS: Record<Tab, string> = { pending: 'PENDING', members: 'APPROVED', rejected: 'REJECTED' }
const PAGE_SIZE = 10

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  active: number
  inactive: number
}

export function UserManagement() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user: currentUser } = useAuth()

  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam && TAB_STATUS[tabParam] ? tabParam : 'members')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('ALL')
  const [departments, setDepartments] = useState<Department[]>([])

  const [approving, setApproving] = useState<ManagedUser | null>(null)
  const [rejecting, setRejecting] = useState<ManagedUser | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [toggling, setToggling] = useState<ManagedUser | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch<Department[]>('/api/departments').then(setDepartments).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadStats = useCallback(() => {
    apiFetch<Stats>('/api/users/stats').then(setStats).catch(() => {})
  }, [])

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({
      status: TAB_STATUS[tab],
      skip: String((page - 1) * PAGE_SIZE),
      take: String(PAGE_SIZE),
    })
    if (search) params.set('search', search)
    if (role !== 'ALL') params.set('role', role)
    try {
      const data = await apiFetch(`/api/users?${params}`)
      setUsers(data.data ?? [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
      setUsers([])
    }
  }, [tab, page, search, role])

  useEffect(() => {
    setUsers(null)
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refresh = () => {
    loadUsers()
    loadStats()
    notifyCountsChanged()
  }

  const changeTab = (next: string) => {
    setTab(next as Tab)
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  const toggleActive = async () => {
    if (!toggling) return
    setBusy(true)
    try {
      if (toggling.isActive) {
        await apiFetch(`/api/users/${toggling.id}`, { method: 'DELETE' })
        toast.success(`${toggling.name} deactivated`)
      } else {
        await apiFetch(`/api/users/${toggling.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        })
        toast.success(`${toggling.name} reactivated`)
      }
      setToggling(null)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setBusy(false)
    }
  }

  const filtersActive = !!search || role !== 'ALL'

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active users" value={stats?.active ?? 0} icon={Users} tone="success" hint={`${stats?.inactive ?? 0} deactivated`} loading={!stats} />
        <StatCard label="Pending requests" value={stats?.pending ?? 0} icon={Clock} tone="warning" hint="Awaiting your review" loading={!stats} />
        <StatCard label="Approved accounts" value={stats?.approved ?? 0} icon={UserCheck} tone="info" loading={!stats} />
        <StatCard label="Rejected requests" value={stats?.rejected ?? 0} icon={UserX} tone="muted" loading={!stats} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Requests
              {!!stats?.pending && <Badge className="h-5 rounded-full px-1.5">{stats.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name or email…" className="pl-9 pr-8" aria-label="Search users" />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {tab === 'members' && (
            <Select
              value={role}
              onValueChange={v => {
                setRole(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="sm:w-40" aria-label="Filter by role">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {ROLE_ORDER.map(r => (
                  <SelectItem key={r} value={r}>
                    {ROLES[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <UserPlus /> Add user
          </Button>
        </div>
      </div>

      {users === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tab === 'pending' ? (
        users.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title={filtersActive ? 'No matching requests' : 'No pending requests'}
            description={filtersActive ? 'Try a different search.' : 'New staff registrations will appear here for review.'}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {users.map(u => (
              <Card key={u.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={u.name} className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{u.name}</p>
                        <StatusBadge kind="account" value="PENDING" />
                      </div>
                      <p className="text-xs text-muted-foreground" title={formatDate(u.createdAt, true)}>
                        Requested {formatRelative(u.createdAt)}
                      </p>
                    </div>
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <Detail icon={Mail} value={u.email} />
                    <Detail icon={Building2} value={u.department?.name} />
                    <Detail icon={Briefcase} value={u.jobTitle} placeholder="No job title" />
                    <Detail icon={Phone} value={u.phone} placeholder="No phone" />
                  </dl>
                  <div className="flex gap-2">
                    <Button variant="success" className="flex-1" onClick={() => setApproving(u)}>
                      <Check /> Approve
                    </Button>
                    <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRejecting(u)}>
                      <X /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>User</TableHead>
                  {tab === 'members' ? (
                    <>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead className="hidden lg:table-cell">Reviewed</TableHead>
                    </>
                  )}
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-6">
                      <EmptyState icon={Users} title={filtersActive ? 'No matching users' : tab === 'rejected' ? 'No rejected requests' : 'No users yet'} className="border-0" />
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {u.name}
                              {u.id === currentUser?.id && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      {tab === 'members' ? (
                        <>
                          <TableCell>
                            <StatusBadge kind="role" value={u.role} />
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">{u.department?.name ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={u.isActive ? 'success' : 'muted'} className="gap-1">
                              <span className={u.isActive ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-muted-foreground'} />
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(u.createdAt)}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell" title={u.rejectionReason ?? undefined}>
                            {u.rejectionReason ?? '—'}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">
                            {u.reviewedAt ? `${formatDate(u.reviewedAt)}${u.reviewedBy ? ` by ${u.reviewedBy.name}` : ''}` : '—'}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${u.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {tab === 'members' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditing(u)
                                    setFormOpen(true)
                                  }}
                                >
                                  <Pencil /> Edit user
                                </DropdownMenuItem>
                                {u.id !== currentUser?.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className={u.isActive ? 'text-destructive focus:text-destructive' : undefined} onClick={() => setToggling(u)}>
                                      {u.isActive ? <UserMinus /> : <UserCheck />}
                                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => setApproving(u)}>
                                <UserCheck /> Approve anyway
                              </DropdownMenuItem>
                            )}
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
      )}

      {users !== null && total > 0 && <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun={tab === 'pending' ? 'requests' : 'users'} />}

      <ApproveUserDialog
        user={approving}
        departments={departments}
        onOpenChange={open => !open && setApproving(null)}
        onDone={() => {
          setApproving(null)
          refresh()
        }}
      />
      <RejectUserDialog
        user={rejecting}
        onOpenChange={open => !open && setRejecting(null)}
        onDone={() => {
          setRejecting(null)
          refresh()
        }}
      />
      <UserFormDialog
        open={formOpen}
        user={editing}
        departments={departments}
        currentUserId={currentUser?.id}
        onOpenChange={open => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        onDone={() => {
          if (editing) {
            setFormOpen(false)
            setEditing(null)
          }
          refresh()
        }}
      />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={open => !open && setToggling(null)}
        title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Reactivate ${toggling?.name}?`}
        description={toggling?.isActive ? 'They will no longer be able to sign in. You can reactivate them at any time.' : 'They will be able to sign in again with their existing password.'}
        confirmText={toggling?.isActive ? 'Deactivate' : 'Reactivate'}
        destructive={toggling?.isActive}
        loading={busy}
        onConfirm={toggleActive}
      />
    </div>
  )
}

function Detail({ icon: Icon, value, placeholder = '—' }: { icon: typeof Mail; value?: string | null; placeholder?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>{value || placeholder}</span>
    </div>
  )
}
