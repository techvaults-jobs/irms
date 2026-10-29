import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { PaymentInstructionsError, PaymentInstructionsService } from '@/services/payment-instructions.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { paymentInstructionsSchema, type PaymentInstructionsInput } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Change the payment instructions of an approved, unpaid requisition
 * (e.g. reassign the payer or switch method). Finance and admin only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'FINANCE' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only finance and admin can change payment instructions' },
        { status: 403 }
      )
    }

    let body: PaymentInstructionsInput
    try {
      body = await validateRequestBody(req, paymentInstructionsSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const requisition = await RequisitionService.getRequisition(params.id)
    if (!requisition) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
    }

    if (requisition.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Payment instructions can only be changed while a requisition is approved and unpaid' },
        { status: 400 }
      )
    }

    try {
      const prepared = await PaymentInstructionsService.prepare(params.id, body)
      await PaymentInstructionsService.apply(params.id, session.user.id, prepared)
    } catch (error) {
      if (error instanceof PaymentInstructionsError) {
        return NextResponse.json(error.toResponse(), { status: 400 })
      }
      throw error
    }

    return NextResponse.json(await RequisitionService.getRequisition(params.id))
  } catch (error: any) {
    console.error('Error updating payment instructions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment instructions' },
      { status: 400 }
    )
  }
}
