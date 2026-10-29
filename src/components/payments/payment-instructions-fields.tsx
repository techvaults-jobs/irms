'use client'

import { useEffect, useState } from 'react'
import { Pencil, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldError } from '@/components/auth/field-error'
import { UserAvatar } from '@/components/shared/user-avatar'
import { PayeeFields } from './payee-fields'
import { PayeeSummary } from './payee-summary'
import {
  PAYEE_FIELDS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_KEYS,
  payeeIssues,
  pickPayeeDetails,
  toPaymentMethod,
  type PayeeDetails,
  type PayeeField,
} from '@/lib/payment'
import { asList, humanize } from '@/lib/utils'

export interface Payer {
  id: string
  name: string
  email: string
  role: string
  department?: { name: string } | null
}

export interface PaymentInstructionsValue {
  approvedPaymentMethod: string
  paymentAssigneeId: string
  paymentDueDate: string
  paymentInstructions: string
  payee: PayeeDetails
  editPayee: boolean
}

/** Starting values: an existing instruction, else the requester's preference. */
export function initialInstructions(requisition: any, fallbackPayerId?: string): PaymentInstructionsValue {
  return {
    approvedPaymentMethod: toPaymentMethod(requisition?.approvedPaymentMethod) ?? toPaymentMethod(requisition?.preferredPaymentMethod) ?? 'BANK_TRANSFER',
    paymentAssigneeId: requisition?.paymentAssigneeId ?? fallbackPayerId ?? '',
    paymentDueDate: requisition?.paymentDueDate ? String(requisition.paymentDueDate).slice(0, 10) : '',
    paymentInstructions: requisition?.paymentInstructions ?? '',
    payee: pickPayeeDetails(requisition ?? {}),
    editPayee: false,
  }
}

/** Client-side checks mirroring the API, keyed like the API's error fields. */
export function validateInstructions(value: PaymentInstructionsValue, currency?: string) {
  const errors: Record<string, string> = {}
  if (!value.approvedPaymentMethod) errors.approvedPaymentMethod = 'Choose how this should be paid'
  if (!value.paymentAssigneeId) errors.paymentAssigneeId = 'Choose who will make the payment'
  if (value.paymentDueDate && value.paymentDueDate < new Date().toISOString().slice(0, 10)) {
    errors.paymentDueDate = 'Due date cannot be in the past'
  }
  for (const [field, message] of Object.entries(payeeIssues(value.payee, value.approvedPaymentMethod, currency))) {
    errors[`payee.${field}`] = message
  }
  return errors
}

export function instructionsPayload(value: PaymentInstructionsValue, original: PayeeDetails) {
  const payee = value.editPayee
    ? Object.fromEntries(PAYEE_FIELDS.filter(f => (value.payee[f] || null) !== (original[f] || null)).map(f => [f, value.payee[f] || null]))
    : undefined
  return {
    approvedPaymentMethod: value.approvedPaymentMethod,
    paymentAssigneeId: value.paymentAssigneeId,
    paymentDueDate: value.paymentDueDate || null,
    paymentInstructions: value.paymentInstructions.trim() || null,
    ...(payee && Object.keys(payee).length ? { payee } : {}),
  }
}

export function usePayers(enabled = true) {
  const [payers, setPayers] = useState<Payer[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/users/payers')
      .then(r => (r.ok ? r.json() : []))
      .then(data => !cancelled && setPayers(asList<Payer>(data)))
      .catch(() => !cancelled && setPayers([]))
    return () => {
      cancelled = true
    }
  }, [enabled])
  return payers
}

interface PaymentInstructionsFieldsProps {
  value: PaymentInstructionsValue
  onChange: (next: PaymentInstructionsValue) => void
  originalPayee: PayeeDetails
  payers: Payer[] | null
  currency?: string
  submitterName?: string
  errors?: Record<string, string>
  disabled?: boolean
}

export function PaymentInstructionsFields({
  value,
  onChange,
  originalPayee,
  payers,
  currency,
  submitterName,
  errors = {},
  disabled,
}: PaymentInstructionsFieldsProps) {
  const set = <K extends keyof PaymentInstructionsValue>(key: K, next: PaymentInstructionsValue[K]) => onChange({ ...value, [key]: next })
  const setPayee = (field: PayeeField, next: string) => onChange({ ...value, payee: { ...value.payee, [field]: next } })
  const payeeErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith('payee.'))
      .map(([key, message]) => [key.slice(6), message])
  )
  const payeeHasErrors = Object.keys(payeeErrors).length > 0
  const method = value.approvedPaymentMethod as keyof typeof PAYMENT_METHODS
  const preferred = toPaymentMethod(originalPayee.preferredPaymentMethod)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="approvedPaymentMethod">Payment method</Label>
          <Select value={value.approvedPaymentMethod} onValueChange={next => set('approvedPaymentMethod', next)} disabled={disabled}>
            <SelectTrigger id="approvedPaymentMethod" aria-invalid={!!errors.approvedPaymentMethod}>
              <SelectValue placeholder="How should this be paid?" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_KEYS.map(key => (
                <SelectItem key={key} value={key}>
                  {PAYMENT_METHODS[key].label}
                  {key === preferred && <span className="ml-1 text-muted-foreground">· requested</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{method && PAYMENT_METHODS[method]?.description}</p>
          <FieldError message={errors.approvedPaymentMethod} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentAssigneeId">Who will make the payment</Label>
          <Select value={value.paymentAssigneeId} onValueChange={next => set('paymentAssigneeId', next)} disabled={disabled || !payers}>
            <SelectTrigger id="paymentAssigneeId" aria-invalid={!!errors.paymentAssigneeId}>
              <SelectValue placeholder={payers === null ? 'Loading…' : payers.length ? 'Choose a payer' : 'No finance users available'} />
            </SelectTrigger>
            <SelectContent>
              {(payers ?? []).map(payer => (
                <SelectItem key={payer.id} value={payer.id}>
                  <span className="flex items-center gap-2">
                    <UserAvatar name={payer.name} className="h-5 w-5" />
                    {payer.name}
                    <span className="text-muted-foreground">· {humanize(payer.role)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">They&apos;ll be notified and only they (or an admin) can record it.</p>
          <FieldError message={errors.paymentAssigneeId} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDueDate">
            Pay by <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="paymentDueDate"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={value.paymentDueDate}
            onChange={e => set('paymentDueDate', e.target.value)}
            disabled={disabled}
            aria-invalid={!!errors.paymentDueDate}
          />
          <FieldError message={errors.paymentDueDate} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="paymentInstructions">
            Instructions for the payer <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="paymentInstructions"
            rows={2}
            value={value.paymentInstructions}
            onChange={e => set('paymentInstructions', e.target.value)}
            placeholder="e.g. Pay from the operations account, split 50/50 on delivery, use narration INV-2041"
            disabled={disabled}
          />
          <FieldError message={errors.paymentInstructions} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Pay to</p>
            <p className="text-xs text-muted-foreground">
              {value.editPayee ? 'Your corrections are saved and recorded in the activity log.' : 'Details provided by the requester.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ ...value, editPayee: !value.editPayee, payee: value.editPayee ? originalPayee : value.payee })}
          >
            {value.editPayee ? (
              <>
                <Undo2 /> Discard changes
              </>
            ) : (
              <>
                <Pencil /> {Object.values(originalPayee).some(Boolean) ? 'Correct details' : 'Add details'}
              </>
            )}
          </Button>
        </div>
        {value.editPayee ? (
          <PayeeFields value={value.payee} onChange={setPayee} method={value.approvedPaymentMethod} currency={currency} errors={payeeErrors} idPrefix="approval-payee" disabled={disabled} />
        ) : (
          <>
            <PayeeSummary payee={value.payee} submitterName={submitterName} />
            {payeeHasErrors && (
              <div className="space-y-1">
                {Object.values(payeeErrors).map(message => (
                  <FieldError key={message} message={message} />
                ))}
                <p className="text-xs text-muted-foreground">Correct the details, or choose a different payment method.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
