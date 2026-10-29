import { z } from 'zod'
import {
  maskAccountNumber,
  payeeDetailsShape,
  payeeIssues,
  paymentInstructionsSchema,
  paymentMethodLabel,
  toPaymentMethod,
} from '@/lib/payment'

const payeeSchema = z.object(payeeDetailsShape)

describe('payee details', () => {
  it('normalises account numbers and blank values', () => {
    const parsed = payeeSchema.parse({
      payeeAccountNumber: ' 0123 456-789 ',
      payeeBankName: '  Zenith   Bank ',
      payeeName: '',
      preferredPaymentMethod: '',
    })
    expect(parsed.payeeAccountNumber).toBe('0123456789')
    expect(parsed.payeeBankName).toBe('Zenith Bank')
    expect(parsed.payeeName).toBeNull()
    expect(parsed.preferredPaymentMethod).toBeNull()
  })

  it('keeps characters like & and / as typed', () => {
    expect(payeeSchema.parse({ payeeName: 'A&B Supplies / Logistics' }).payeeName).toBe('A&B Supplies / Logistics')
  })

  it('rejects malformed account numbers, phones and emails', () => {
    expect(payeeSchema.safeParse({ payeeAccountNumber: '12' }).success).toBe(false)
    expect(payeeSchema.safeParse({ payeePhone: 'call me' }).success).toBe(false)
    expect(payeeSchema.safeParse({ payeeEmail: 'nope' }).success).toBe(false)
    expect(payeeSchema.safeParse({ preferredPaymentMethod: 'BITCOIN' }).success).toBe(false)
  })

  it('requires full bank details for a bank transfer, with 10-digit NUBAN for NGN', () => {
    expect(Object.keys(payeeIssues({}, 'BANK_TRANSFER', 'NGN')).sort()).toEqual(
      ['payeeAccountName', 'payeeAccountNumber', 'payeeBankName']
    )
    const details = { payeeBankName: 'GTBank', payeeAccountName: 'Acme Ltd', payeeAccountNumber: '12345678' }
    expect(payeeIssues(details, 'BANK_TRANSFER', 'NGN').payeeAccountNumber).toMatch(/10 digits/)
    expect(payeeIssues(details, 'BANK_TRANSFER', 'GBP')).toEqual({})
    expect(payeeIssues({ ...details, payeeAccountNumber: '0123456789' }, 'BANK_TRANSFER', 'NGN')).toEqual({})
  })

  it('requires a wallet number for mobile money and a name for cheques', () => {
    expect(payeeIssues({}, 'MOBILE_MONEY').payeePhone).toBeDefined()
    expect(payeeIssues({ payeeType: 'VENDOR' }, 'CHEQUE').payeeName).toBeDefined()
    expect(payeeIssues({ payeeType: 'SELF' }, 'CASH')).toEqual({})
  })

  it('asks for nothing when no method is chosen', () => {
    expect(payeeIssues({}, null)).toEqual({})
    expect(payeeIssues({}, 'CORPORATE_CARD')).toEqual({})
  })

  it('masks all but the last four digits', () => {
    expect(maskAccountNumber('0123456789')).toBe('••••••6789')
    expect(maskAccountNumber('123')).toBe('123')
    expect(maskAccountNumber(null)).toBeNull()
  })
})

describe('payment methods', () => {
  it('maps legacy free-text methods to codes', () => {
    expect(toPaymentMethod('Bank Transfer')).toBe('BANK_TRANSFER')
    expect(toPaymentMethod('Check')).toBe('CHEQUE')
    expect(toPaymentMethod('MOBILE_MONEY')).toBe('MOBILE_MONEY')
    expect(paymentMethodLabel('Credit Card')).toBe('Corporate card')
    expect(paymentMethodLabel('Something custom')).toBe('Something custom')
  })
})

describe('payment instructions', () => {
  it('requires a method and a payer', () => {
    const result = paymentInstructionsSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.map(e => e.path[0]).sort()).toEqual(['approvedPaymentMethod', 'paymentAssigneeId'])
    }
  })

  it('parses due dates and optional payee corrections', () => {
    const parsed = paymentInstructionsSchema.parse({
      approvedPaymentMethod: 'BANK_TRANSFER',
      paymentAssigneeId: 'user_1',
      paymentDueDate: '2030-01-15',
      payee: { payeeAccountNumber: '0123456789' },
    })
    expect(parsed.paymentDueDate).toBeInstanceOf(Date)
    expect(parsed.payee?.payeeAccountNumber).toBe('0123456789')
    expect(paymentInstructionsSchema.parse({ approvedPaymentMethod: 'CASH', paymentAssigneeId: 'u' }).paymentDueDate).toBeNull()
  })
})
