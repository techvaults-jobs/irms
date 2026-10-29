'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, GitBranch, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FieldError } from '@/components/auth/field-error'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { ROLES } from '@/lib/status'
import { apiFetch, asList, formatMoney } from '@/lib/utils'

interface ApprovalRule {
  id: string
  minAmount: string | number
  maxAmount: string | number | null
  requiredApprovers: string[]
  departmentId: string | null
  department?: { id: string; name: string } | null
}

interface Department {
  id: string
  name: string
}

const APPROVER_ROLES = ['MANAGER', 'FINANCE', 'ADMIN']
const ALL_DEPARTMENTS = '__all__'
const EMPTY_FORM = { minAmount: '', maxAmount: '', requiredApprovers: [] as string[], departmentId: ALL_DEPARTMENTS }

export function ApprovalRuleConfig() {
  const [rules, setRules] = useState<ApprovalRule[] | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalRule | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<ApprovalRule | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setRules(asList(await apiFetch('/api/approval-rules?take=100')))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load rules')
      setRules([])
    }
  }, [])

  useEffect(() => {
    load()
    apiFetch<Department[]>('/api/departments').then(setDepartments).catch(() => {})
  }, [load])

  const openForm = (rule?: ApprovalRule) => {
    setEditing(rule ?? null)
    setErrors({})
    setForm(
      rule
        ? {
            minAmount: String(rule.minAmount),
            maxAmount: rule.maxAmount != null ? String(rule.maxAmount) : '',
            requiredApprovers: rule.requiredApprovers,
            departmentId: rule.departmentId ?? ALL_DEPARTMENTS,
          }
        : EMPTY_FORM
    )
    setDialogOpen(true)
  }

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      requiredApprovers: f.requiredApprovers.includes(role) ? f.requiredApprovers.filter(r => r !== role) : [...f.requiredApprovers, role],
    }))
    setErrors(e => ({ ...e, requiredApprovers: '' }))
  }

  const save = async () => {
    const next: Record<string, string> = {}
    const min = parseFloat(form.minAmount)
    const max = form.maxAmount ? parseFloat(form.maxAmount) : null
    if (form.minAmount === '' || isNaN(min) || min < 0) next.minAmount = 'Enter a minimum of 0 or more'
    if (max !== null && (isNaN(max) || max <= min)) next.maxAmount = 'Maximum must be greater than the minimum'
    if (form.requiredApprovers.length === 0) next.requiredApprovers = 'Choose at least one approver'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const payload = {
        minAmount: min,
        ...(max !== null && { maxAmount: max }),
        requiredApprovers: form.requiredApprovers,
        ...(form.departmentId !== ALL_DEPARTMENTS && { departmentId: form.departmentId }),
      }
      await apiFetch(editing ? `/api/approval-rules/${editing.id}` : '/api/approval-rules', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      toast.success(editing ? 'Rule updated' : 'Rule created')
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await apiFetch(`/api/approval-rules/${toDelete.id}`, { method: 'DELETE' })
      toast.success('Rule deleted')
      setToDelete(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" /> Approval rules
          </CardTitle>
          <CardDescription>Amount thresholds decide which roles must approve a requisition, in order.</CardDescription>
        </div>
        <Button size="sm" onClick={() => openForm()}>
          <Plus /> Add rule
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {rules === null ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState icon={GitBranch} title="No approval rules" description="Without rules, submitted requisitions can't be routed." className="mx-6" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Amount range</TableHead>
                <TableHead>Approval chain</TableHead>
                <TableHead className="hidden sm:table-cell">Applies to</TableHead>
                <TableHead className="w-12 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="pl-6 font-medium tabular-nums">
                    {formatMoney(rule.minAmount)} – {rule.maxAmount != null ? formatMoney(rule.maxAmount) : 'and above'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {rule.requiredApprovers.map((role, i) => (
                        <span key={`${role}-${i}`} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          <Badge variant={ROLES[role]?.variant ?? 'outline'}>{ROLES[role]?.label ?? role}</Badge>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{rule.department?.name ?? 'All departments'}</TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Rule actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(rule)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(rule)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={open => !saving && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit approval rule' : 'New approval rule'}</DialogTitle>
            <DialogDescription>Requisitions whose estimated cost falls in this range require these approvals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum (₦)</Label>
                <Input id="minAmount" type="number" min="0" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} aria-invalid={!!errors.minAmount} />
                <FieldError message={errors.minAmount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">
                  Maximum (₦) <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input id="maxAmount" type="number" min="0" placeholder="No limit" value={form.maxAmount} onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))} aria-invalid={!!errors.maxAmount} />
                <FieldError message={errors.maxAmount} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Approvers, in order</Label>
              <div className="grid gap-2">
                {APPROVER_ROLES.map(role => {
                  const position = form.requiredApprovers.indexOf(role)
                  return (
                    <Label key={role} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal hover:bg-accent/50">
                      <Checkbox checked={position >= 0} onCheckedChange={() => toggleRole(role)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ROLES[role].label}</p>
                        <p className="text-xs text-muted-foreground">{ROLES[role].description}</p>
                      </div>
                      {position >= 0 && <Badge variant="outline">Step {position + 1}</Badge>}
                    </Label>
                  )
                })}
              </div>
              <FieldError message={errors.requiredApprovers} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={value => setForm(f => ({ ...f, departmentId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? 'Save rule' : 'Create rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={open => !open && setToDelete(null)}
        title="Delete approval rule?"
        description="Requisitions submitted afterwards will no longer be routed by this rule."
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={remove}
      />
    </Card>
  )
}
