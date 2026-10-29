'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, HandCoins, Loader2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PayeeSummary } from './payee-summary'
import {
  PaymentInstructionsFields,
  initialInstructions,
  instructionsPayload,
  usePayers,
  validateInstructions,
  type PaymentInstructionsValue,
} from './payment-instructions-fields'
import { notifyCountsChanged } from '@/hooks/useNavCounts'
import { paymentMethodLabel, pickPayeeDetails } from '@/lib/payment'
import { cn, formatDate, getApiErrorMessage, humanize } from '@/lib/utils'

export function dueState(dueDate?: string | null, status?: string) {
  if (!dueDate || status !== 'APPROVED') return null
  const days = Math.ceil((new Date(dueDate).setHours(23, 59, 59, 999) - Date.now()) / 86_400_000)
  if (days < 0) return { label: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, variant: 'danger' as const }
  if (days === 0) return { label: 'Due today', variant: 'warning' as const }
  if (days <= 3) return { label: `Due in ${days} day${days === 1 ? '' : 's'}`, variant: 'warning' as const }
  return { label: `Due ${formatDate(dueDate)}`, variant: 'muted' as const }
}

interface PaymentPlanCardProps {
  requisition: any
  viewer?: { id: string; role: string } | null
  onChange?: () => void
}

/** Payee details from the requester alongside the approver's payment instructions. */
export function PaymentPlanCard({ requisition, viewer, onChange }: PaymentPlanCardProps) {
  const [editing, setEditing] = useState(false)
  const payee = pickPayeeDetails(requisition)
  const instructed = !!requisition.approvedPaymentMethod
  const canEdit = requisition.status === 'APPROVED' && (viewer?.role === 'FINANCE' || viewer?.role === 'ADMIN')
  const isPayer = !!viewer && requisition.paymentAssigneeId === viewer.id
  const due = dueState(requisition.paymentDueDate, requisition.status)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="h-4 w-4" /> Payment
          </CardTitle>
          <CardDescription>Where the money goes, and how it will be paid.</CardDescription>
        </div>
        {canEdit && instructed && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Change
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Pay to</h3>
          <PayeeSummary payee={payee} submitterName={requisition.submitter?.name} revealed={isPayer} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Instructions</h3>
          {instructed ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="info">{paymentMethodLabel(requisition.approvedPaymentMethod)}</Badge>
                {due && (
                  <Badge variant={due.variant}>
                    <CalendarClock className="mr-1 h-3 w-3" />
                    {due.label}
                  </Badge>
                )}
              </div>
              {requisition.paymentAssignee && (
                <div className={cn('flex items-center gap-3 rounded-lg border p-3', isPayer && 'border-primary/40 bg-primary/5')}>
                  <UserAvatar name={requisition.paymentAssignee.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {requisition.paymentAssignee.name}
                      {isPayer && <span className="font-normal text-primary"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {humanize(requisition.paymentAssignee.role ?? '')} · responsible for paying
                    </p>
                  </div>
                </div>
              )}
              {requisition.paymentInstructions && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{requisition.paymentInstructions}</p>}
              {requisition.paymentInstructedBy && (
                <p className="text-xs text-muted-foreground">
                  Set by {requisition.paymentInstructedBy.name}
                  {requisition.paymentInstructedAt && ` · ${formatDate(requisition.paymentInstructedAt, true)}`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {requisition.status === 'APPROVED' || requisition.status === 'PAID' || requisition.status === 'CLOSED'
                ? 'No payment instructions were recorded.'
                : 'The final approver will choose the payment method and who makes the payment.'}
            </p>
          )}
          {canEdit && !instructed && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <HandCoins /> Set instructions
            </Button>
          )}
        </section>
      </CardContent>

      {editing && (
        <EditInstructionsDialog
          requisition={requisition}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            notifyCountsChanged()
            onChange?.()
          }}
        />
      )}
    </Card>
  )
}

function EditInstructionsDialog({ requisition, onClose, onSaved }: { requisition: any; onClose: () => void; onSaved: () => void }) {
  const payers = usePayers()
  const [value, setValue] = useState<PaymentInstructionsValue>(() => initialInstructions(requisition))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const originalPayee = pickPayeeDetails(requisition)
  const reassigning = !!requisition.paymentAssigneeId && value.paymentAssigneeId !== requisition.paymentAssigneeId

  const save = async () => {
    const next = validateInstructions(value, requisition.currency)
    setErrors(next)
    if (Object.keys(next).length) {
      if (Object.keys(next).some(key => key.startsWith('payee.'))) setValue(v => ({ ...v, editPayee: true }))
      return
    }
    setSaving(true)
    try {
      const response = await fetch(`/api/requisitions/${requisition.id}/payment-instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instructionsPayload(value, originalPayee)),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const issues: { field: string; message: string }[] = data?.error?.details ?? []
        if (issues.length) setErrors(Object.fromEntries(issues.map(d => [d.field, d.message])))
        throw new Error(getApiErrorMessage(data, 'Failed to save payment instructions'))
      }
      toast.success('Payment instructions updated')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save payment instructions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment instructions</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{requisition.title}</span> — changes are recorded in the activity log.
          </DialogDescription>
        </DialogHeader>
        <PaymentInstructionsFields
          value={value}
          onChange={next => {
            setValue(next)
            setErrors({})
          }}
          originalPayee={originalPayee}
          payers={payers}
          currency={requisition.currency}
          submitterName={requisition.submitter?.name}
          errors={errors}
          disabled={saving}
        />
        {reassigning && (
          <p className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" /> The new payer will be notified. {requisition.paymentAssignee?.name} will no longer be able to record this payment.
          </p>
        )}
        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
