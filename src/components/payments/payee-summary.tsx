'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PAYEE_TYPES, hasPayeeDetails, maskAccountNumber, paymentMethodLabel, type PayeeDetails, type PayeeType } from '@/lib/payment'
import { cn } from '@/lib/utils'

interface PayeeSummaryProps {
  payee: PayeeDetails
  submitterName?: string
  /** Start with the account number visible (e.g. for the assigned payer). */
  revealed?: boolean
  showPreferred?: boolean
  className?: string
}

export function payeeDisplayName(payee: PayeeDetails, submitterName?: string) {
  return payee.payeeAccountName || payee.payeeName || (payee.payeeType === 'SELF' ? submitterName : null) || null
}

/** Where the money should go, with copy buttons for the values a payer types into a bank app. */
export function PayeeSummary({ payee, submitterName, revealed = false, showPreferred = true, className }: PayeeSummaryProps) {
  const [showAccount, setShowAccount] = useState(revealed)

  if (!hasPayeeDetails(payee)) {
    return <p className={cn('text-sm text-muted-foreground', className)}>The requester didn&apos;t provide payment details.</p>
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  const rows: { label: string; value?: string | null; copyable?: boolean; mono?: boolean; secret?: boolean }[] = [
    { label: 'Payee', value: payee.payeeType === 'SELF' ? submitterName : payee.payeeName },
    { label: 'Bank / provider', value: payee.payeeBankName, copyable: true },
    { label: 'Account number', value: payee.payeeAccountNumber, copyable: true, mono: true, secret: true },
    { label: 'Account name', value: payee.payeeAccountName, copyable: true },
    { label: 'Sort / SWIFT code', value: payee.payeeBankCode, copyable: true, mono: true },
    { label: 'Wallet phone', value: payee.payeePhone, copyable: true, mono: true },
    { label: 'Email', value: payee.payeeEmail, copyable: true },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {payee.payeeType && <Badge variant="muted">{PAYEE_TYPES[payee.payeeType as PayeeType]?.label ?? payee.payeeType}</Badge>}
        {showPreferred && payee.preferredPaymentMethod && (
          <Badge variant="outline">Prefers {paymentMethodLabel(payee.preferredPaymentMethod)}</Badge>
        )}
      </div>
      <dl className="divide-y rounded-lg border text-sm">
        {rows
          .filter(row => row.value)
          .map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className={cn('truncate font-medium', row.mono && 'font-mono tracking-wider')}>
                  {row.secret && !showAccount ? maskAccountNumber(row.value) : row.value}
                </span>
                {row.secret && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowAccount(v => !v)}
                    aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                  >
                    {showAccount ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                {row.copyable && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(row.label, row.value!)} aria-label={`Copy ${row.label.toLowerCase()}`}>
                    <Copy />
                  </Button>
                )}
              </dd>
            </div>
          ))}
      </dl>
      {payee.payeeNotes && (
        <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
          <span className="font-medium">Note: </span>
          {payee.payeeNotes}
        </p>
      )}
    </div>
  )
}
