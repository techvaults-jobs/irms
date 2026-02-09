import { auth } from '@/auth'
import { FinancialTrackingService } from '@/services/financial-tracking.service'
import { RequisitionService } from '@/services/requisition.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { paymentRecordingSchema } from '@/lib/validation-schemas'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userRole = session.user.role as UserRole
    if (userRole !== 'FINANCE' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only finance and admin can record payments' },
        { status: 403 }
      )
    }

    let paymentData: any
    try {
      paymentData = await validateRequestBody(req, paymentRecordingSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    // Get requisition
    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Check if requisition is approved
    if (requisition.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error: 'Can only record payment for approved requisitions',
          currentStatus: requisition.status,
        },
        { status: 400 }
      )
    }

    // Record payment
    const paid = await FinancialTrackingService.recordPayment(
      params.id,
      session.user.id,
      paymentData,
      paymentData.varianceThreshold
    )

    // Record status change in audit trail (non-blocking - don't fail if audit trail fails)
    try {
      await AuditTrailService.recordStatusChange(
        params.id,
        session.user.id,
        requisition.status,
        paid.status,
        'Payment recorded'
      )
    } catch (auditError) {
      console.error('Warning: Failed to record audit trail for payment:', auditError)
      // Don't fail the payment recording if audit trail fails
    }

    // Send payment notifications (non-blocking)
    try {
      const amountPaid = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(Number(paymentData.amountPaid))

      await NotificationTriggersService.triggerPaymentNotifications(
        params.id,
        amountPaid
      )
    } catch (notificationError) {
      console.error('Warning: Failed to send payment notifications:', notificationError)
    }

    return NextResponse.json(paid)
  } catch (error: any) {
    console.error('Error recording payment:', error)

    // Handle specific error messages
    if (error.message?.includes('Payment amount exceeds approved cost')) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      )
    }

    if (error.message?.includes('Can only record payment')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 400 }
    )
  }
}
