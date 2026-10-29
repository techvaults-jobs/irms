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
import { PaymentReferenceGenerator } from '@/lib/payment-reference-generator'
import { cn, formatMoney, getApiErrorMessage, toNumber } from '@/lib/utils'

interface PaymentRecordingFormProps {
  requisitionId: string
  approvedCost: string | number
  currency: string
  onPaymentRecorded?: () => void
}

const METHODS = ['Bank Transfer', 'Check', 'Credit Card', 'Internal Transfer', 'Cash', 'Other']
const VARIANCE_THRESHOLD = 0.1

export function PaymentRecordingForm({ requisitionId, approvedCost, currency, onPaymentRecorded }: PaymentRecordingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    actualCostPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    paymentReference: PaymentReferenceGenerator.generate(),
    paymentComment: '',
  })

  const approved = toNumber(approvedCost)
  const actual = toNumber(formData.actualCostPaid)
  const variance = actual > 0 && approved > 0 ? (actual - approved) / approved : 0
  const exceedsThreshold = variance > VARIANCE_THRESHOLD

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
      <CardContent>
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
                {METHODS.map(method => (
                  <SelectItem key={method} value={method}>
                    {method}
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="paymentComment">
              Comment {!exceedsThreshold && <span className="font-normal text-muted-foreground">(optional)</span>}
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
