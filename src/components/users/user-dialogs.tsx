'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, RefreshCw, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FieldError } from '@/components/auth/field-error'
import { UserAvatar } from '@/components/shared/user-avatar'
import { ROLES, ROLE_ORDER } from '@/lib/status'
import { apiFetch, cn } from '@/lib/utils'

export interface ManagedUser {
  id: string
  email: string
  name: string
  role: string
  departmentId: string
  department?: { id: string; name: string } | null
  isActive: boolean
  accountStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  jobTitle?: string | null
  phone?: string | null
  reviewedAt?: string | null
  reviewedBy?: { id: string; name: string } | null
  rejectionReason?: string | null
  createdAt: string
}

export interface Department {
  id: string
  name: string
}

function RolePicker({ value, onChange }: { value: string; onChange: (role: string) => void }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid gap-2 sm:grid-cols-2">
      {ROLE_ORDER.map(role => {
        const meta = ROLES[role]
        return (
          <Label
            key={role}
            htmlFor={`role-${role}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-accent/50',
              value === role && 'border-primary bg-primary/5 ring-1 ring-primary'
            )}
          >
            <RadioGroupItem value={role} id={`role-${role}`} className="mt-0.5" />
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <meta.icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="block text-xs text-muted-foreground">{meta.description}</span>
            </div>
          </Label>
        )
      })}
    </RadioGroup>
  )
}

function DepartmentSelect({ value, onChange, departments, id }: { value: string; onChange: (v: string) => void; departments: Department[]; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select department" />
      </SelectTrigger>
      <SelectContent>
        {departments.map(d => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ApplicantSummary({ user }: { user: ManagedUser }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <UserAvatar name={user.name} className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {user.email}
          {user.jobTitle ? ` · ${user.jobTitle}` : ''}
        </p>
      </div>
    </div>
  )
}

export function ApproveUserDialog({
  user,
  departments,
  onOpenChange,
  onDone,
}: {
  user: ManagedUser | null
  departments: Department[]
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [role, setRole] = useState('STAFF')
  const [departmentId, setDepartmentId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setRole('STAFF')
      setDepartmentId(user.departmentId)
    }
  }, [user])

  const approve = async () => {
    if (!user) return
    setSaving(true)
    try {
      await apiFetch(`/api/users/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, departmentId }),
      })
      toast.success(`${user.name} approved`, { description: `They can now sign in as ${ROLES[role].label}.` })
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={open => !saving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-success" /> Approve account
          </DialogTitle>
          <DialogDescription>Choose the role and department this person should have.</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <ApplicantSummary user={user} />
            <div className="space-y-2">
              <Label>Role</Label>
              <RolePicker value={role} onChange={setRole} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve-department">Department</Label>
              <DepartmentSelect id="approve-department" value={departmentId} onChange={setDepartmentId} departments={departments} />
              {user.department && departmentId !== user.departmentId && (
                <p className="text-xs text-muted-foreground">They requested {user.department.name}.</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="success" onClick={approve} disabled={saving || !departmentId}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Approve & grant access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const REJECT_REASONS = ['Not a current staff member', 'Duplicate account', 'Incorrect or incomplete details', 'Please use your company email']

export function RejectUserDialog({
  user,
  onOpenChange,
  onDone,
}: {
  user: ManagedUser | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setReason('')
      setError(null)
    }
  }, [user])

  const reject = async () => {
    if (!user) return
    if (!reason.trim()) {
      setError('Give the applicant a reason')
      return
    }
    setSaving(true)
    try {
      await apiFetch(`/api/users/${user.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      toast.success(`Request from ${user.name} rejected`)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={open => !saving && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" /> Reject request
          </DialogTitle>
          <DialogDescription>The applicant will be told why. They can submit a new request later.</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <ApplicantSummary user={user} />
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <div className="flex flex-wrap gap-1.5">
                {REJECT_REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setReason(r)
                      setError(null)
                    }}
                    className={cn('rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent', reason === r && 'border-destructive/50 bg-destructive/10 text-destructive')}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Textarea
                id="reject-reason"
                rows={3}
                value={reason}
                onChange={e => {
                  setReason(e.target.value)
                  setError(null)
                }}
                placeholder="Explain why this request is being declined…"
                aria-invalid={!!error}
              />
              <FieldError message={error ?? undefined} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={reject} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Reject request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  const base = Array.from(bytes, b => chars[b % chars.length]).join('')
  return `${base}#${(bytes[0] % 90) + 10}`
}

export function UserFormDialog({
  open,
  user,
  departments,
  currentUserId,
  onOpenChange,
  onDone,
}: {
  open: boolean
  user: ManagedUser | null
  departments: Department[]
  currentUserId?: string
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const isEdit = !!user
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF', departmentId: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setCreated(null)
    setForm(
      user
        ? { name: user.name, email: user.email, password: '', role: user.role, departmentId: user.departmentId }
        : { name: '', email: '', password: generatePassword(), role: 'STAFF', departmentId: departments[0]?.id ?? '' }
    )
  }, [open, user, departments])

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email'
    if (!isEdit && form.password.length < 8) next.password = 'At least 8 characters'
    if (!form.departmentId) next.departmentId = 'Select a department'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      if (isEdit) {
        await apiFetch(`/api/users/${user!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, role: form.role, departmentId: form.departmentId }),
        })
        toast.success('User updated')
        onDone()
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        setCreated({ email: form.email.trim().toLowerCase(), password: form.password })
        onDone()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const editingSelf = isEdit && user?.id === currentUserId

  return (
    <Dialog open={open} onOpenChange={next => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit user' : created ? 'User created' : 'Add user'}</DialogTitle>
          <DialogDescription>
            {isEdit ? user?.email : created ? 'Share these credentials securely.' : 'Create an account that is approved immediately.'}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <Alert className="border-success/30 bg-success/5">
            <KeyRound className="h-4 w-4 !text-success" />
            <AlertTitle>Credentials for {created.email}</AlertTitle>
            <AlertDescription className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1 font-mono text-sm">{created.password}</code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(created.password)
                    toast.success('Password copied')
                  }}
                  aria-label="Copy password"
                >
                  <Copy />
                </Button>
              </div>
              <p className="text-xs">This password won&apos;t be shown again.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full name</Label>
                <Input id="user-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} aria-invalid={!!errors.name} />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" type="email" value={form.email} disabled={isEdit} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} aria-invalid={!!errors.email} />
                <FieldError message={errors.email} />
              </div>
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="user-password">Temporary password</Label>
                <div className="flex gap-2">
                  <Input id="user-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="font-mono" aria-invalid={!!errors.password} />
                  <Button type="button" variant="outline" size="icon" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))} aria-label="Generate password">
                    <RefreshCw />
                  </Button>
                </div>
                <FieldError message={errors.password} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-department">Department</Label>
              <DepartmentSelect id="user-department" value={form.departmentId} onChange={v => setForm(f => ({ ...f, departmentId: v }))} departments={departments} />
              <FieldError message={errors.departmentId} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              {editingSelf ? (
                <p className="text-sm text-muted-foreground">You can&apos;t change your own role.</p>
              ) : (
                <RolePicker value={form.role} onChange={role => setForm(f => ({ ...f, role }))} />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {created ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {isEdit ? 'Save changes' : 'Create user'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
