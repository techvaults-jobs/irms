import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { rejectRequisitionSchema } from '@/lib/validation-schemas'
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
    if (userRole !== 'MANAGER' && userRole !== 'FINANCE' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only managers and finance can reject requisitions' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await validateRequestBody(req, rejectRequisitionSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return handleValidationError(error)
      }
      throw error
    }

    const { comment } = body

    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Get next pending approval step
    const nextStep = await ApprovalWorkflowService.getNextPendingStep(params.id)

    if (!nextStep) {
      return NextResponse.json(
        { error: 'No pending approval steps' },
        { status: 400 }
      )
    }

    // For ADMIN users, reject all pending steps at once
    if (userRole === 'ADMIN') {
      const allPendingSteps = await ApprovalWorkflowService.getPendingApprovalSteps(params.id)
      
      for (const step of allPendingSteps) {
        await ApprovalWorkflowService.rejectStep(step.id, session.user.id, comment || `Rejected by Admin: ${session.user.name}`)
      }

      // Transition requisition to Rejected status
      const rejected = await RequisitionService.rejectRequisition(params.id)

      // Record rejection in audit trail (non-blocking)
      try {
        await AuditTrailService.recordRejection(
          params.id,
          session.user.id,
          comment || `Bulk rejected all ${allPendingSteps.length} steps`
        )
      } catch (auditError) {
        console.error('Warning: Failed to record rejection audit trail:', auditError)
      }

      // Record status change (non-blocking)
      try {
        await AuditTrailService.recordStatusChange(
          params.id,
          session.user.id,
          requisition.status,
          rejected.status,
          `Admin rejected all ${allPendingSteps.length} approval steps: ${comment}`
        )
      } catch (auditError) {
        console.error('Warning: Failed to record status change audit trail:', auditError)
      }

      // Send rejection notifications (non-blocking)
      try {
        await NotificationTriggersService.triggerRejectionNotifications(
          params.id,
          comment || 'No reason provided'
        )
      } catch (notificationError) {
        console.error('Warning: Failed to send rejection notifications:', notificationError)
      }

      return NextResponse.json(rejected)
    }

    // For non-admin users, verify they are assigned to this approval step
    if (nextStep.assignedUserId && nextStep.assignedUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to approve this requisition' },
        { status: 403 }
      )
    }

    // Reject the step
    await ApprovalWorkflowService.rejectStep(nextStep.id, session.user.id, comment)

    // Transition requisition to Rejected status
    const rejected = await RequisitionService.rejectRequisition(params.id)

    // Record rejection in audit trail (non-blocking)
    try {
      await AuditTrailService.recordRejection(
        params.id,
        session.user.id,
        comment
      )
    } catch (auditError) {
      console.error('Warning: Failed to record rejection audit trail:', auditError)
    }

    // Record status change (non-blocking)
    try {
      await AuditTrailService.recordStatusChange(
        params.id,
        session.user.id,
        requisition.status,
        rejected.status,
        `Rejected by ${session.user.name}: ${comment}`
      )
    } catch (auditError) {
      console.error('Warning: Failed to record status change audit trail:', auditError)
    }

    // Send rejection notifications (non-blocking)
    try {
      await NotificationTriggersService.triggerRejectionNotifications(
        params.id,
        comment || 'No reason provided'
      )
    } catch (notificationError) {
      console.error('Warning: Failed to send rejection notifications:', notificationError)
    }

    return NextResponse.json(rejected)
  } catch (error: any) {
    console.error('Error rejecting requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject requisition' },
      { status: 400 }
    )
  }
}
