'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Copy, Loader2, RefreshCw, Wallet } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FieldError } from '@/components/auth/field-error'
import { PayeeSummary } from '@/components/payments/payee-summary'
import { PaymentReferenceGenerator } from '@/lib/payment-reference-generator'
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS, hasPayeeDetails, paymentMethodLabel, toPaymentMethod, type PayeeDetails } from '@/lib/payment'
import { cn, formatMoney, getApiErrorMessage, toNumber } from '@/lib/utils'

interface PaymentRecordingFormProps {
  requisitionId: string
  approvedCost: string | number
  currency: string
  /** Method the approver asked for; using another one requires a comment. */
  approvedMethod?: string | null
  payee?: PayeeDetails
  submitterName?: string
  instructions?: string | null
  onPaymentRecorded?: () => void
}

const VARIANCE_THRESHOLD = 0.1

export function PaymentRecordingForm({
  requisitionId,
  approvedCost,
  currency,
  approvedMethod,
  payee,
  submitterName,
  instructions,
  onPaymentRecorded,
}: PaymentRecordingFormProps) {
  const instructedMethod = toPaymentMethod(approvedMethod)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    actualCostPaid: toNumber(approvedCost) ? String(toNumber(approvedCost)) : '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: instructedMethod ?? toPaymentMethod(payee?.preferredPaymentMethod) ?? 'BANK_TRANSFER',
    paymentReference: PaymentReferenceGenerator.generate(),
    paymentComment: '',
  })

  const approved = toNumber(approvedCost)
  const actual = toNumber(formData.actualCostPaid)
  const variance = actual > 0 && approved > 0 ? (actual - approved) / approved : 0
  const exceedsThreshold = variance > VARIANCE_THRESHOLD
  const methodDiffers = !!instructedMethod && formData.paymentMethod !== instructedMethod
  const commentRequired = exceedsThreshold || methodDiffers

  const setField = (name: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.actualCostPaid) errors.actualCostPaid = 'Amount paid is required'
    else if (actual <= 0) errors.actualCostPaid = 'Amount must be greater than 0'
    if (!formData.paymentDate) errors.paymentDate = 'Payment date is required'
    if (exceedsThreshold && !formData.paymentComment.trim()) {
      errors.paymentComment = 'Explain why the payment exceeds the approved cost by more than 10%'
    } else if (methodDiffers && !formData.paymentComment.trim()) {
      errors.paymentComment = `Explain why ${paymentMethodLabel(formData.paymentMethod)} was used instead of ${paymentMethodLabel(instructedMethod)}`
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/requisitions/${requisitionId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getApiErrorMessage(data, 'Failed to record payment'))

      toast.success('Payment recorded', { description: `${formatMoney(actual, currency)} · ${formData.paymentReference}` })
      onPaymentRecorded?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" /> Record payment
        </CardTitle>
        <CardDescription>
          Approved amount: <span className="font-semibold text-foreground tabular-nums">{formatMoney(approved, currency)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(payee && hasPayeeDetails(payee)) || instructions ? (
          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Pay to</p>
              {payee && <PayeeSummary payee={payee} submitterName={submitterName} revealed showPreferred={false} />}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Approver&apos;s instructions</p>
              <p className="text-sm">
                {instructedMethod ? (
                  <>
                    Pay by <span className="font-medium">{paymentMethodLabel(instructedMethod)}</span>.
                  </>
                ) : (
                  'No method specified.'
                )}
              </p>
              {instructions && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{instructions}</p>}
            </div>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor="actualCostPaid">Amount paid</Label>
            <Input
              id="actualCostPaid"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formData.actualCostPaid}
              onChange={e => setField('actualCostPaid', e.target.value)}
              placeholder={approved.toString()}
              className="tabular-nums"
              aria-invalid={!!validationErrors.actualCostPaid}
            />
            {actual > 0 && (
              <p className={cn('text-xs tabular-nums', exceedsThreshold ? 'text-destructive' : 'text-muted-foreground')}>
                Variance {variance > 0 ? '+' : ''}
                {(variance * 100).toFixed(1)}% vs. approved
              </p>
            )}
            <FieldError message={validationErrors.actualCostPaid} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment date</Label>
            <Input id="paymentDate" type="date" value={formData.paymentDate} onChange={e => setField('paymentDate', e.target.value)} aria-invalid={!!validationErrors.paymentDate} />
            <FieldError message={validationErrors.paymentDate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Method</Label>
            <Select value={formData.paymentMethod} onValueChange={value => setField('paymentMethod', value)}>
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_KEYS.map(method => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHODS[method].label}
                    {method === instructedMethod && <span className="ml-1 text-muted-foreground">· instructed</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentReference">Reference</Label>
            <div className="flex gap-2">
              <Input id="paymentReference" value={formData.paymentReference} readOnly className="bg-muted/50 font-mono text-xs" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="icon" onClick={() => setField('paymentReference', PaymentReferenceGenerator.generate())} aria-label="Generate new reference">
                    <RefreshCw />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate new reference</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(formData.paymentReference)
                      toast.success('Reference copied')
                    }}
                    aria-label="Copy reference"
                  >
                    <Copy />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy reference</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {exceedsThreshold && (
            <Alert variant="destructive" className="md:col-span-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>This payment exceeds the approved cost by more than 10%. A comment is required.</AlertDescription>
            </Alert>
          )}
          {methodDiffers && (
            <Alert variant="destructive" className="md:col-span-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The approver asked for {paymentMethodLabel(instructedMethod)}. Using {paymentMethodLabel(formData.paymentMethod)} requires a comment.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="paymentComment">
              Comment {!commentRequired && <span className="font-normal text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id="paymentComment"
              rows={3}
              value={formData.paymentComment}
              onChange={e => setField('paymentComment', e.target.value)}
              placeholder={exceedsThreshold ? 'Explain why the payment exceeds the approved cost' : 'Notes about this payment'}
              aria-invalid={!!validationErrors.paymentComment}
            />
            <FieldError message={validationErrors.paymentComment} />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
              Record payment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
