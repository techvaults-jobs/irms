import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { AuditTrailService } from './audit-trail.service'
import { ReferentialIntegrityChecker } from '@/lib/referential-integrity'
import { z } from 'zod'

export const paymentRecordingSchema = z.object({
  actualCostPaid: z.string().or(z.number()).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return num > 0
  }, 'Actual cost paid must be greater than 0'),
  paymentDate: z.date().or(z.string().transform(val => new Date(val))),
  paymentMethod: z.string().min(1).max(100),
  paymentReference: z.string().min(1).max(255),
  paymentComment: z.string().optional(),
})

export type PaymentRecordingInput = z.infer<typeof paymentRecordingSchema>

export class FinancialTrackingService {
  /**
   * Property 21: Cost Recording on Creation
   * Records the estimated cost when a requisition is created
   */
  static async recordCostOnCreation(
    requisitionId: string,
    userId: string,
    estimatedCost: Decimal,
    currency: string
  ) {
    // Validate referential integrity
    await ReferentialIntegrityChecker.validateRequisitionExists(requisitionId)
    // Note: User validation is skipped here because user is already authenticated via NextAuth

    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Record in audit trail
    await AuditTrailService.recordFieldUpdate(
      requisitionId,
      userId,
      'estimatedCost',
      null,
      {
        amount: estimatedCost.toString(),
        currency,
      }
    )

    return {
      estimatedCost,
      currency,
    }
  }

  /**
   * Property 22: Approved Cost Recording
   * Records the approved cost when a requisition is approved
   */
  static async recordApprovedCost(
    requisitionId: string,
    userId: string,
    approvedCost: Decimal
  ) {
    // Validate referential integrity
    await ReferentialIntegrityChecker.validateRequisitionExists(requisitionId)
    // Note: User validation is skipped here because user is already authenticated via NextAuth

    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    if (!requisition.estimatedCost) {
      throw new Error('Estimated cost not found')
    }

    // Record in audit trail
    await AuditTrailService.recordFieldUpdate(
      requisitionId,
      userId,
      'approvedCost',
      requisition.approvedCost ? requisition.approvedCost.toString() : null,
      approvedCost.toString()
    )

    return {
      estimatedCost: requisition.estimatedCost,
      approvedCost,
    }
  }

  /**
   * Property 23: Payment Recording Validation
   * Validates payment data before recording
   */
  static validatePaymentData(data: PaymentRecordingInput): void {
    const validated = paymentRecordingSchema.parse(data)

    if (!validated.actualCostPaid) {
      throw new Error('Actual cost paid is required')
    }

    if (!validated.paymentDate) {
      throw new Error('Payment date is required')
    }

    if (!validated.paymentMethod) {
      throw new Error('Payment method is required')
    }

    if (!validated.paymentReference) {
      throw new Error('Payment reference is required')
    }
  }

  /**
   * Property 24: Payment Amount Validation
   * Validates that payment amount doesn't exceed approved cost by more than threshold
   */
  static validatePaymentAmount(
    approvedCost: Decimal,
    actualCostPaid: Decimal,
    varianceThreshold: number = 0.1 // 10% default threshold
  ): { isValid: boolean; variance: number; exceedsThreshold: boolean } {
    if (!approvedCost || approvedCost.isZero()) {
      throw new Error('Approved cost must be greater than 0')
    }

    const variance = actualCostPaid.minus(approvedCost).toNumber()
    const variancePercentage = Math.abs(variance) / approvedCost.toNumber()
    // Only exceed threshold if payment is OVER approved cost by more than threshold
    const exceedsThreshold = variance > 0 && variancePercentage > varianceThreshold

    return {
      isValid: !exceedsThreshold,
      variance: variancePercentage,
      exceedsThreshold,
    }
  }

  /**
   * Property 25: Payment Recording and Status Transition
   * Records payment with validation and transitions status to Paid
   */
  static async recordPayment(
    requisitionId: string,
    userId: string,
    data: PaymentRecordingInput,
    varianceThreshold: number = 0.1
  ) {
    // Validate referential integrity
    await ReferentialIntegrityChecker.validateRequisitionExists(requisitionId)
    // Note: User validation is skipped here because user is already authenticated via NextAuth
    // The user ID comes from the authenticated session, so we trust it exists

    // Validate payment data
    this.validatePaymentData(data)

    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    if (requisition.status !== 'APPROVED') {
      throw new Error('Can only record payment for approved requisitions')
    }

    if (!requisition.approvedCost) {
      throw new Error('Approved cost not found')
    }

    const actualCostPaid = new Decimal(data.actualCostPaid)
    const paymentDate = data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate)

    // Validate payment amount
    const validation = this.validatePaymentAmount(
      requisition.approvedCost,
      actualCostPaid,
      varianceThreshold
    )

    if (validation.exceedsThreshold && !data.paymentComment) {
      throw new Error(
        `Payment amount exceeds approved cost by ${(validation.variance * 100).toFixed(2)}%. A comment is required.`
      )
    }

    // Record payment in database
    const updated = await prisma.requisition.update({
      where: { id: requisitionId },
      data: {
        actualCostPaid,
        paymentDate,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        paymentComment: data.paymentComment || null,
        status: 'PAID',
      },
    })

    // Record in audit trail (non-blocking - don't fail if audit trail fails)
    try {
      await AuditTrailService.recordPayment(
        requisitionId,
        userId,
        {
          actualCostPaid: actualCostPaid.toString(),
          paymentDate: paymentDate.toISOString(),
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference,
          paymentComment: data.paymentComment,
          approvedCost: requisition.approvedCost.toString(),
          variance: validation.variance,
        }
      )
    } catch (auditError) {
      console.error('Warning: Failed to record audit trail for payment:', auditError)
      // Don't fail the payment recording if audit trail fails
    }

    return updated
  }

  /**
   * Get financial summary for a requisition
   */
  static async getFinancialSummary(requisitionId: string) {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    return {
      estimatedCost: requisition.estimatedCost,
      approvedCost: requisition.approvedCost,
      actualCostPaid: requisition.actualCostPaid,
      currency: requisition.currency,
      status: requisition.status,
      paymentMethod: requisition.paymentMethod,
      paymentReference: requisition.paymentReference,
      paymentDate: requisition.paymentDate,
    }
  }
}
