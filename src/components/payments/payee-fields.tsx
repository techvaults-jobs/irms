'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/auth/field-error'
import { NIGERIAN_BANKS, PAYMENT_METHODS, type PayeeDetails, type PayeeField, type PaymentMethod } from '@/lib/payment'

interface PayeeFieldsProps {
  value: PayeeDetails
  onChange: (field: PayeeField, value: string) => void
  /** The method whose details to collect; falls back to the payee's preferred method. */
  method?: string | null
  currency?: string
  errors?: Partial<Record<string, string>>
  idPrefix?: string
  disabled?: boolean
}

/** Account fields for the chosen payment method (bank, wallet, or just a payee name). */
export function PayeeFields({ value, onChange, method, currency, errors = {}, idPrefix = 'payee', disabled }: PayeeFieldsProps) {
  const selected = (method ?? value.preferredPaymentMethod) as PaymentMethod | null | undefined
  const needs = selected && selected in PAYMENT_METHODS ? PAYMENT_METHODS[selected].needs : 'none'
  const isNaira = (currency ?? 'NGN') === 'NGN'
  const id = (field: string) => `${idPrefix}-${field}`
  const field = (name: PayeeField) => ({
    id: id(name),
    value: value[name] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value),
    'aria-invalid': !!errors[name],
    disabled,
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {value.payeeType !== 'SELF' && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id('payeeName')}>{value.payeeType === 'VENDOR' ? 'Vendor / business name' : 'Payee name'}</Label>
          <Input {...field('payeeName')} placeholder={value.payeeType === 'VENDOR' ? 'e.g. Acme Supplies Ltd' : 'Who should receive the money?'} />
          <FieldError message={errors.payeeName} />
        </div>
      )}

      {needs === 'bank' && (
        <>
          <div className="space-y-2">
            <Label htmlFor={id('payeeBankName')}>Bank</Label>
            <Input {...field('payeeBankName')} list={isNaira ? id('banks') : undefined} placeholder={isNaira ? 'Start typing, e.g. Zenith' : 'Bank name'} autoComplete="off" />
            {isNaira && (
              <datalist id={id('banks')}>
                {NIGERIAN_BANKS.map(bank => (
                  <option key={bank} value={bank} />
                ))}
              </datalist>
            )}
            <FieldError message={errors.payeeBankName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('payeeAccountNumber')}>Account number</Label>
            <Input
              {...field('payeeAccountNumber')}
              inputMode={isNaira ? 'numeric' : 'text'}
              maxLength={isNaira ? 10 : 34}
              placeholder={isNaira ? '10-digit NUBAN' : 'Account number or IBAN'}
              className="font-mono tracking-wider"
              autoComplete="off"
            />
            <FieldError message={errors.payeeAccountNumber} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('payeeAccountName')}>Account name</Label>
            <Input {...field('payeeAccountName')} placeholder="Exactly as it appears on the account" />
            <FieldError message={errors.payeeAccountName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('payeeBankCode')}>
              {isNaira ? 'Sort code' : 'SWIFT / sort / routing code'} <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input {...field('payeeBankCode')} className="font-mono" placeholder={isNaira ? 'e.g. 057150013' : 'e.g. BARCGB22'} />
            <FieldError message={errors.payeeBankCode} />
          </div>
        </>
      )}

      {needs === 'wallet' && (
        <>
          <div className="space-y-2">
            <Label htmlFor={id('payeePhone')}>Wallet phone number</Label>
            <Input {...field('payeePhone')} type="tel" inputMode="tel" placeholder="+234 801 234 5678" />
            <FieldError message={errors.payeePhone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id('payeeBankName')}>
              Provider <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input {...field('payeeBankName')} placeholder="e.g. OPay, PalmPay, M-Pesa" />
            <FieldError message={errors.payeeBankName} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={id('payeeAccountName')}>Wallet name</Label>
            <Input {...field('payeeAccountName')} placeholder="Name registered on the wallet" />
            <FieldError message={errors.payeeAccountName} />
          </div>
        </>
      )}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id('payeeEmail')}>
          Payee email <span className="font-normal text-muted-foreground">(optional, for remittance advice)</span>
        </Label>
        <Input {...field('payeeEmail')} type="email" placeholder="accounts@vendor.com" />
        <FieldError message={errors.payeeEmail} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id('payeeNotes')}>
          Notes for the payer <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea {...field('payeeNotes')} rows={2} placeholder="Invoice number, narration to use, split payments…" />
        <FieldError message={errors.payeeNotes} />
      </div>
    </div>
  )
}
