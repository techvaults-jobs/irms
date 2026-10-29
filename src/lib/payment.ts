import { z } from 'zod'

/**
 * Payment methods, payee details and payment instructions.
 * Shared by the client forms and the API so both validate the same way.
 */

export const PAYMENT_METHODS = {
  BANK_TRANSFER: { label: 'Bank transfer', description: 'Transfer to a bank account', needs: 'bank' },
  MOBILE_MONEY: { label: 'Mobile money', description: 'Wallet such as OPay, PalmPay or M-Pesa', needs: 'wallet' },
  CHEQUE: { label: 'Cheque', description: 'Cheque issued to the payee', needs: 'payee' },
  CASH: { label: 'Cash', description: 'Cash handed to the payee', needs: 'payee' },
  PETTY_CASH: { label: 'Petty cash', description: 'Paid from the petty cash float', needs: 'payee' },
  CORPORATE_CARD: { label: 'Corporate card', description: 'Paid with a company card', needs: 'none' },
  POS: { label: 'POS', description: 'Card payment at a point of sale', needs: 'none' },
  INTERNAL_TRANSFER: { label: 'Internal transfer', description: 'Between company accounts or cost centres', needs: 'none' },
  OTHER: { label: 'Other', description: 'Describe in the instructions', needs: 'none' },
} as const

export type PaymentMethod = keyof typeof PAYMENT_METHODS
export const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]]

const LEGACY_METHOD_LABELS: Record<string, PaymentMethod> = {
  'Bank Transfer': 'BANK_TRANSFER',
  Check: 'CHEQUE',
  'Credit Card': 'CORPORATE_CARD',
  'Internal Transfer': 'INTERNAL_TRANSFER',
  Cash: 'CASH',
  Other: 'OTHER',
}

/** Normalises a stored method (new code or legacy free-text label) to a code. */
export function toPaymentMethod(value?: string | null): PaymentMethod | null {
  if (!value) return null
  if (value in PAYMENT_METHODS) return value as PaymentMethod
  return LEGACY_METHOD_LABELS[value] ?? null
}

export function paymentMethodLabel(value?: string | null) {
  if (!value) return null
  const method = toPaymentMethod(value)
  return method ? PAYMENT_METHODS[method].label : value
}

export const PAYEE_TYPES = {
  SELF: { label: 'Myself', description: 'Reimburse me' },
  VENDOR: { label: 'Vendor / supplier', description: 'Pay the business supplying this' },
  OTHER: { label: 'Someone else', description: 'Another person or organisation' },
} as const

export type PayeeType = keyof typeof PAYEE_TYPES
export const PAYEE_TYPE_KEYS = Object.keys(PAYEE_TYPES) as [PayeeType, ...PayeeType[]]

export const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Jaiz Bank',
  'Keystone Bank',
  'Kuda Microfinance Bank',
  'Moniepoint Microfinance Bank',
  'OPay',
  'PalmPay',
  'Parallex Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
]

export const PAYEE_FIELDS = [
  'payeeType',
  'payeeName',
  'preferredPaymentMethod',
  'payeeBankName',
  'payeeAccountName',
  'payeeAccountNumber',
  'payeeBankCode',
  'payeePhone',
  'payeeEmail',
  'payeeNotes',
] as const

export type PayeeField = (typeof PAYEE_FIELDS)[number]
export type PayeeDetails = Partial<Record<PayeeField, string | null>>

// Strips control characters and collapses whitespace. React escapes on render and
// emails escape explicitly, so values are stored as typed (no HTML entities).
const text = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or less`)
    .transform(val => val.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())

const optionalText = (max: number, label: string) =>
  z.union([text(max, label), z.null()]).optional().transform(val => (val ? val : val === undefined ? undefined : null))

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(val => (val === '' ? null : val), z.union([schema, z.null()]).optional())

export const payeeDetailsShape = {
  payeeType: emptyToNull(z.enum(PAYEE_TYPE_KEYS)),
  payeeName: optionalText(150, 'Payee name'),
  preferredPaymentMethod: emptyToNull(z.enum(PAYMENT_METHOD_KEYS)),
  payeeBankName: optionalText(120, 'Bank name'),
  payeeAccountName: optionalText(150, 'Account name'),
  payeeAccountNumber: z
    .union([z.string(), z.null()])
    .optional()
    .transform(val => (typeof val === 'string' ? val.replace(/[\s-]/g, '').toUpperCase() || null : val))
    .refine(val => !val || /^[A-Z0-9]{4,34}$/.test(val), 'Account number must be 4–34 letters or digits'),
  payeeBankCode: optionalText(40, 'Sort code / SWIFT'),
  payeePhone: z
    .union([z.string(), z.null()])
    .optional()
    .transform(val => (typeof val === 'string' ? val.trim() || null : val))
    .refine(val => !val || /^\+?[0-9()\-\s]{7,20}$/.test(val), 'Enter a valid phone number'),
  payeeEmail: z
    .union([z.string(), z.null()])
    .optional()
    .transform(val => (typeof val === 'string' ? val.trim().toLowerCase() || null : val))
    .refine(val => !val || z.string().email().safeParse(val).success, 'Enter a valid email address'),
  payeeNotes: optionalText(1000, 'Payment notes'),
}

/**
 * Cross-field checks for the details a payment method needs.
 * Only applied when the method is known, so drafts can be saved partially filled.
 */
export function payeeIssues(
  details: PayeeDetails,
  method: string | null | undefined,
  currency?: string | null
): Partial<Record<PayeeField, string>> {
  const issues: Partial<Record<PayeeField, string>> = {}
  const needs = method && method in PAYMENT_METHODS ? PAYMENT_METHODS[method as PaymentMethod].needs : 'none'

  if (needs === 'bank') {
    if (!details.payeeBankName) issues.payeeBankName = 'Bank name is required for a bank transfer'
    if (!details.payeeAccountName) issues.payeeAccountName = 'Account name is required for a bank transfer'
    if (!details.payeeAccountNumber) issues.payeeAccountNumber = 'Account number is required for a bank transfer'
    else if (currency === 'NGN' && !/^\d{10}$/.test(details.payeeAccountNumber.replace(/[\s-]/g, ''))) {
      issues.payeeAccountNumber = 'Nigerian (NUBAN) account numbers are 10 digits'
    }
  }
  if (needs === 'wallet') {
    if (!details.payeePhone) issues.payeePhone = 'Wallet phone number is required for mobile money'
    if (!details.payeeAccountName && !details.payeeName) issues.payeeAccountName = 'Wallet name is required for mobile money'
  }
  if (needs === 'payee' && !details.payeeName && details.payeeType !== 'SELF') {
    issues.payeeName = 'Payee name is required'
  }
  return issues
}

export function hasPayeeDetails(details: PayeeDetails) {
  return PAYEE_FIELDS.some(field => !!details[field])
}

export function pickPayeeDetails(source: Record<string, any>): PayeeDetails {
  return Object.fromEntries(PAYEE_FIELDS.map(field => [field, source?.[field] ?? null])) as PayeeDetails
}

/** Masks all but the last four characters, e.g. ******1234. */
export function maskAccountNumber(value?: string | null) {
  if (!value) return null
  return value.length <= 4 ? value : `${'•'.repeat(Math.min(value.length - 4, 6))}${value.slice(-4)}`
}

export const paymentInstructionsShape = {
  approvedPaymentMethod: z.enum(PAYMENT_METHOD_KEYS, {
    errorMap: () => ({ message: 'Choose how this should be paid' }),
  }),
  paymentAssigneeId: z.string().min(1, 'Choose who will make the payment'),
  paymentDueDate: z
    .union([z.string(), z.null()])
    .optional()
    .transform(val => (val ? new Date(val) : null))
    .refine(val => !val || !isNaN(val.getTime()), 'Due date must be a valid date'),
  paymentInstructions: optionalText(2000, 'Payment instructions'),
  payee: z.object(payeeDetailsShape).partial().optional(),
}

export const paymentInstructionsSchema = z.object(paymentInstructionsShape)
export type PaymentInstructionsInput = z.infer<typeof paymentInstructionsSchema>

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
