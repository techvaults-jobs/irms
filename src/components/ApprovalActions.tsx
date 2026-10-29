'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, HandCoins, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError } from '@/components/auth/field-error'
import {
  PaymentInstructionsFields,
  initialInstructions,
  instructionsPayload,
  usePayers,
  validateInstructions,
  type PaymentInstructionsValue,
} from '@/components/payments/payment-instructions-fields'
import { useAuth } from '@/hooks/useAuth'
import { notifyCountsChanged } from '@/hooks/useNavCounts'
import { pickPayeeDetails } from '@/lib/payment'
import { humanize, getApiErrorMessage, formatMoney, toNumber } from '@/lib/utils'

interface ApprovalStep {
  id: string
  stepNumber: number
  requiredRole: string
  status: string
}

interface ApprovalActionsProps {
  requisitionId: string
  requisitionTitle?: string
  steps?: ApprovalStep[]
  onSuccess?: () => void
  compact?: boolean
  initialAction?: 'approve' | 'reject'
}

export function ApprovalActions({
  requisitionId,
  requisitionTitle,
  steps,
  onSuccess,
  compact = false,
  initialAction,
}: ApprovalActionsProps) {
  const { user } = useAuth()
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [details, setDetails] = useState<any>(null)
  const [instructions, setInstructions] = useState<PaymentInstructionsValue | null>(null)
  const [approvedCost, setApprovedCost] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const currentStep = steps?.find(step => step.status === 'PENDING')
  const totalSteps = steps?.length ?? 0
  const pendingCount = steps?.filter(step => step.status === 'PENDING').length ?? 0
  // The approval that completes the workflow also decides how it gets paid
  const isFinal = user?.role === 'ADMIN' || pendingCount === 1
  const collectsPayment = dialog === 'approve' && isFinal
  const payers = usePayers(collectsPayment)

  useEffect(() => {
    if (!collectsPayment) return
    let cancelled = false
    setDetails(null)
    fetch(`/api/requisitions/${requisitionId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Failed to load requisition'))))
      .then(data => {
        if (cancelled) return
        setDetails(data)
        setInstructions(initialInstructions(data))
        setApprovedCost(String(toNumber(data.approvedCost ?? data.estimatedCost) || ''))
      })
      .catch(err => !cancelled && toast.error(err.message))
    return () => {
      cancelled = true
    }
  }, [collectsPayment, requisitionId])

  // Preselect the payer when there's only one choice
  useEffect(() => {
    if (instructions && !instructions.paymentAssigneeId && payers?.length === 1) {
      setInstructions({ ...instructions, paymentAssigneeId: payers[0].id })
    }
  }, [payers, instructions])

  useEffect(() => {
    if (initialAction) setDialog(initialAction)
  }, [initialAction])

  const open = (kind: 'approve' | 'reject') => {
    setComment('')
    setValidationError(null)
    setFieldErrors({})
    setDialog(kind)
  }

  const handleConfirm = async () => {
    if (dialog === 'reject' && !comment.trim()) {
      setValidationError('A rejection reason is required')
      return
    }

    let payment: Record<string, unknown> = {}
    if (collectsPayment) {
      if (!instructions || !details) return
      const errors = validateInstructions(instructions, details.currency)
      if (!(toNumber(approvedCost) > 0)) errors.approvedCost = 'Approved amount must be greater than 0'
      setFieldErrors(errors)
      if (Object.keys(errors).length) {
        if (Object.keys(errors).some(key => key.startsWith('payee.')) && !instructions.editPayee) {
          setInstructions({ ...instructions, editPayee: true })
        }
        return
      }
      payment = { ...instructionsPayload(instructions, pickPayeeDetails(details)), approvedCost }
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/${dialog}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() || undefined, ...payment }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const issues: { field: string; message: string }[] = data?.error?.details ?? []
        if (issues.length) setFieldErrors(Object.fromEntries(issues.map(d => [d.field, d.message])))
        throw new Error(getApiErrorMessage(data, `Failed to ${dialog} requisition`))
      }

      const payer = payers?.find(p => p.id === instructions?.paymentAssigneeId)
      toast.success(dialog === 'approve' ? 'Requisition approved' : 'Requisition rejected', {
        description: collectsPayment && payer ? `${requisitionTitle ?? ''} · payment assigned to ${payer.name}` : requisitionTitle,
      })
      setDialog(null)
      notifyCountsChanged()
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const buttons = (
    <div className="flex gap-2">
      <Button variant="success" className="flex-1" size={compact ? 'sm' : 'default'} onClick={() => open('approve')}>
        <CheckCircle2 /> Approve
      </Button>
      <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" size={compact ? 'sm' : 'default'} onClick={() => open('reject')}>
        <XCircle /> Reject
      </Button>
    </div>
  )

  return (
    <>
      {compact ? (
        buttons
      ) : (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/[0.06] to-transparent">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Your review is needed</p>
                <p className="text-sm text-muted-foreground">
                  {currentStep
                    ? `Step ${currentStep.stepNumber} of ${totalSteps} · ${humanize(currentStep.requiredRole)} approval`
                    : 'This requisition is awaiting a decision.'}
                </p>
              </div>
            </div>
            <div className="sm:w-72">{buttons}</div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog !== null} onOpenChange={next => !isLoading && !next && setDialog(null)}>
        <DialogContent className={collectsPayment ? 'max-h-[92vh] overflow-y-auto sm:max-w-2xl' : undefined}>
          <DialogHeader>
            <div
              className={
                dialog === 'approve'
                  ? 'mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success'
                  : 'mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive'
              }
            >
              {dialog === 'approve' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <DialogTitle>{dialog === 'approve' ? 'Approve requisition' : 'Reject requisition'}</DialogTitle>
            <DialogDescription>
              {requisitionTitle ? <span className="font-medium text-foreground">{requisitionTitle}</span> : null}
              {requisitionTitle ? ' — ' : null}
              {dialog === 'approve'
                ? collectsPayment
                  ? 'This is the final approval. Confirm the amount and say how, and by whom, it should be paid.'
                  : 'Approving moves this to the next step, or marks it approved if this is the final step.'
                : 'The requester will be notified with your reason.'}
            </DialogDescription>
          </DialogHeader>
          {collectsPayment &&
            (!details || !instructions ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="approvedCost">Approved amount ({details.currency})</Label>
                  <Input
                    id="approvedCost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={approvedCost}
                    onChange={e => {
                      setApprovedCost(e.target.value)
                      setFieldErrors(prev => ({ ...prev, approvedCost: '' }))
                    }}
                    className="tabular-nums"
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.approvedCost}
                  />
                  <p className="text-xs text-muted-foreground">
                    Requested {formatMoney(details.estimatedCost, details.currency)}
                    {toNumber(approvedCost) > 0 && toNumber(approvedCost) !== toNumber(details.estimatedCost) && (
                      <> · approving {formatMoney(toNumber(approvedCost), details.currency)}</>
                    )}
                  </p>
                  <FieldError message={fieldErrors.approvedCost} />
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HandCoins className="h-4 w-4 text-primary" /> Payment instructions
                </div>
                <PaymentInstructionsFields
                  value={instructions}
                  onChange={next => {
                    setInstructions(next)
                    setFieldErrors({})
                  }}
                  originalPayee={pickPayeeDetails(details)}
                  payers={payers}
                  currency={details.currency}
                  submitterName={details.submitter?.name}
                  errors={fieldErrors}
                  disabled={isLoading}
                />
                <Separator />
              </div>
            ))}
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              {dialog === 'approve' ? 'Comment' : 'Reason for rejection'}
              {dialog === 'approve' && <span className="font-normal text-muted-foreground"> (optional)</span>}
            </Label>
            <Textarea
              id="approval-comment"
              rows={4}
              value={comment}
              onChange={e => {
                setComment(e.target.value)
                setValidationError(null)
              }}
              placeholder={dialog === 'approve' ? 'Add a note for the record…' : 'Explain what needs to change…'}
              aria-invalid={!!validationError}
            />
            <FieldError message={validationError ?? undefined} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant={dialog === 'approve' ? 'success' : 'destructive'}
              onClick={handleConfirm}
              disabled={isLoading || (collectsPayment && (!details || !instructions))}
            >
              {isLoading && <Loader2 className="animate-spin" />}
              {dialog === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
