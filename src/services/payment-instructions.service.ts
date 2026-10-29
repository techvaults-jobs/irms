import { prisma } from '@/lib/prisma'
import {
  PAYEE_FIELDS,
  PAYMENT_METHODS,
  escapeHtml,
  maskAccountNumber,
  payeeIssues,
  pickPayeeDetails,
  type PayeeDetails,
  type PaymentMethod,
} from '@/lib/payment'
import { AuditChangeType, AuditTrailService } from './audit-trail.service'
import { NotificationService } from './notification.service'

export interface PaymentInstructionsData {
  approvedPaymentMethod: PaymentMethod
  paymentAssigneeId: string
  paymentDueDate?: Date | null
  paymentInstructions?: string | null
  payee?: PayeeDetails
}

/** Field-level problems with payment instructions, returned to the client as a 400. */
export class PaymentInstructionsError extends Error {
  constructor(public readonly details: Array<{ field: string; message: string }>) {
    super(details.map(d => d.message).join('. '))
    this.name = 'PaymentInstructionsError'
  }

  toResponse() {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payment instructions are incomplete',
        details: this.details,
      },
    }
  }
}

export const PAYER_ROLES = ['FINANCE', 'ADMIN'] as const

export class PaymentInstructionsService {
  /** Active, approved finance and admin users who can be asked to make a payment. */
  static async listPayers() {
    return prisma.user.findMany({
      where: { role: { in: [...PAYER_ROLES] }, isActive: true, accountStatus: 'APPROVED' },
      select: { id: true, name: true, email: true, role: true, department: { select: { name: true } } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
  }

  /**
   * Checks the instructions against the requisition without writing anything,
   * so a bad request never leaves a requisition half-approved.
   * Returns the update to apply and the before/after values for the audit trail.
   */
  static async prepare(requisitionId: string, data: Partial<PaymentInstructionsData>) {
    const requisition = await prisma.requisition.findUnique({ where: { id: requisitionId } })
    if (!requisition) throw new Error('Requisition not found')

    const issues: Array<{ field: string; message: string }> = []
    if (!data.approvedPaymentMethod) issues.push({ field: 'approvedPaymentMethod', message: 'Choose how this should be paid' })
    if (!data.paymentAssigneeId) issues.push({ field: 'paymentAssigneeId', message: 'Choose who will make the payment' })

    if (data.paymentAssigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.paymentAssigneeId },
        select: { role: true, isActive: true, accountStatus: true },
      })
      if (!assignee || !assignee.isActive || assignee.accountStatus !== 'APPROVED') {
        issues.push({ field: 'paymentAssigneeId', message: 'The selected payer is not an active user' })
      } else if (!(PAYER_ROLES as readonly string[]).includes(assignee.role)) {
        issues.push({ field: 'paymentAssigneeId', message: 'Payments can only be assigned to finance or admin users' })
      }
    }

    if (data.paymentDueDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (data.paymentDueDate < today) issues.push({ field: 'paymentDueDate', message: 'Due date cannot be in the past' })
    }

    // Approvers may correct the payee details; only fields they sent are changed
    const currentPayee = pickPayeeDetails(requisition)
    const payeeChanges: PayeeDetails = {}
    for (const field of PAYEE_FIELDS) {
      const next = data.payee?.[field]
      if (next !== undefined && (next ?? null) !== (currentPayee[field] ?? null)) payeeChanges[field] = next ?? null
    }
    const finalPayee = { ...currentPayee, ...payeeChanges }

    if (data.approvedPaymentMethod) {
      for (const [field, message] of Object.entries(payeeIssues(finalPayee, data.approvedPaymentMethod, requisition.currency))) {
        issues.push({ field: `payee.${field}`, message })
      }
    }

    if (issues.length) throw new PaymentInstructionsError(issues)

    const previous = {
      approvedPaymentMethod: requisition.approvedPaymentMethod,
      paymentAssigneeId: requisition.paymentAssigneeId,
      paymentDueDate: requisition.paymentDueDate?.toISOString() ?? null,
      paymentInstructions: requisition.paymentInstructions,
    }

    return {
      previous,
      payeeChanges,
      previousPayee: currentPayee,
      update: {
        approvedPaymentMethod: data.approvedPaymentMethod!,
        paymentAssigneeId: data.paymentAssigneeId!,
        paymentDueDate: data.paymentDueDate ?? null,
        paymentInstructions: data.paymentInstructions ?? null,
        ...payeeChanges,
      },
      assigneeChanged: previous.paymentAssigneeId !== data.paymentAssigneeId,
    }
  }

  /** Saves prepared instructions, records them in the audit trail and notifies the payer. */
  static async apply(
    requisitionId: string,
    instructedById: string,
    prepared: Awaited<ReturnType<typeof PaymentInstructionsService.prepare>>,
    { notify = true }: { notify?: boolean } = {}
  ) {
    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        ...prepared.update,
        paymentInstructedById: instructedById,
        paymentInstructedAt: new Date(),
      },
      include: { paymentAssignee: { select: { id: true, name: true, email: true } } },
    })

    try {
      await AuditTrailService.recordChange(
        requisitionId,
        instructedById,
        AuditChangeType.PAYMENT_INSTRUCTED,
        undefined,
        prepared.previous.paymentAssigneeId ? prepared.previous : undefined,
        {
          approvedPaymentMethod: prepared.update.approvedPaymentMethod,
          paymentAssignee: updated.paymentAssignee?.name,
          paymentDueDate: prepared.update.paymentDueDate?.toISOString() ?? null,
          paymentInstructions: prepared.update.paymentInstructions,
        }
      )
      // Payee corrections are recorded field by field; account numbers are masked
      for (const [field, value] of Object.entries(prepared.payeeChanges)) {
        const mask = field === 'payeeAccountNumber' ? maskAccountNumber : (v: string | null | undefined) => v ?? null
        await AuditTrailService.recordFieldUpdate(
          requisitionId,
          instructedById,
          field,
          mask(prepared.previousPayee[field as keyof PayeeDetails]),
          mask(value)
        )
      }
    } catch (auditError) {
      console.error('Warning: Failed to record payment instructions audit trail:', auditError)
    }

    if (notify && prepared.assigneeChanged && updated.paymentAssignee) {
      try {
        await this.notifyAssignee(updated)
      } catch (notificationError) {
        console.error('Warning: Failed to notify payment assignee:', notificationError)
      }
    }

    return updated
  }

  private static async notifyAssignee(requisition: {
    id: string
    title: string
    currency: string
    approvedCost: unknown
    estimatedCost: unknown
    approvedPaymentMethod: string | null
    paymentDueDate: Date | null
    payeeName: string | null
    payeeAccountName: string | null
    paymentAssignee: { id: string; name: string; email: string } | null
  }) {
    const assignee = requisition.paymentAssignee!
    const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: requisition.currency || 'NGN' }).format(
      Number(requisition.approvedCost ?? requisition.estimatedCost)
    )
    const method = requisition.approvedPaymentMethod
      ? PAYMENT_METHODS[requisition.approvedPaymentMethod as PaymentMethod]?.label ?? requisition.approvedPaymentMethod
      : 'Not specified'
    const payee = requisition.payeeAccountName || requisition.payeeName || 'See requisition'
    const due = requisition.paymentDueDate ? requisition.paymentDueDate.toDateString() : 'No due date'
    const title = escapeHtml(requisition.title)

    await NotificationService.sendNotification(
      assignee.id,
      requisition.id,
      'PAYMENT_ASSIGNED',
      `Payment assigned to you: ${requisition.title} (${amount})`,
      {
        to: assignee.email,
        subject: `Payment assigned: ${requisition.title}`,
        html: `
          <h2>Payment assigned to you</h2>
          <p>Hi ${escapeHtml(assignee.name)},</p>
          <p>You have been asked to make the payment for:</p>
          <p><strong>${title}</strong></p>
          <p>Requisition ID: ${requisition.id}</p>
          <p><strong>Amount:</strong> ${amount}<br>
          <strong>Method:</strong> ${escapeHtml(method)}<br>
          <strong>Pay to:</strong> ${escapeHtml(payee)}<br>
          <strong>Due:</strong> ${due}</p>
          <p>Open the requisition in IRMS for the full account details, then record the payment once it is made.</p>
          <p>Best regards,<br>IRMS System</p>
        `,
        text: `Payment assigned to you\n\nHi ${assignee.name},\n\nYou have been asked to make the payment for:\n\n${requisition.title}\n\nRequisition ID: ${requisition.id}\n\nAmount: ${amount}\nMethod: ${method}\nPay to: ${payee}\nDue: ${due}\n\nOpen the requisition in IRMS for the full account details, then record the payment once it is made.\n\nBest regards,\nIRMS System`,
      }
    )
  }
}
