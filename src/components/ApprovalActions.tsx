'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { notifyCountsChanged } from '@/hooks/useNavCounts'
import { humanize, getApiErrorMessage } from '@/lib/utils'

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
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentStep = steps?.find(step => step.status === 'PENDING')
  const totalSteps = steps?.length ?? 0

  useEffect(() => {
    if (initialAction) setDialog(initialAction)
  }, [initialAction])

  const open = (kind: 'approve' | 'reject') => {
    setComment('')
    setValidationError(null)
    setDialog(kind)
  }

  const handleConfirm = async () => {
    if (dialog === 'reject' && !comment.trim()) {
      setValidationError('A rejection reason is required')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/${dialog}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getApiErrorMessage(data, `Failed to ${dialog} requisition`))

      toast.success(dialog === 'approve' ? 'Requisition approved' : 'Requisition rejected', {
        description: requisitionTitle,
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
        <DialogContent>
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
                ? 'Approving moves this to the next step, or marks it approved if this is the final step.'
                : 'The requester will be notified with your reason.'}
            </DialogDescription>
          </DialogHeader>
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
            <Button variant={dialog === 'approve' ? 'success' : 'destructive'} onClick={handleConfirm} disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              {dialog === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
