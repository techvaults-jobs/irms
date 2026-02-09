import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { validateRequestBody, handleValidationError, ValidationError } from '@/lib/validation-middleware'
import { approveRequisitionSchema } from '@/lib/validation-schemas'
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
        { error: 'Only managers and finance can approve requisitions' },
        { status: 403 }
      )
    }

    let body: any
    try {
      body = await validateRequestBody(req, approveRequisitionSchema)
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

    // For ADMIN users, approve all pending steps at once
    if (userRole === 'ADMIN') {
      const allPendingSteps = await ApprovalWorkflowService.getPendingApprovalSteps(params.id)
      
      for (const step of allPendingSteps) {
        await ApprovalWorkflowService.approveStep(step.id, session.user.id, comment || `Approved by Admin: ${session.user.name}`)
      }

      // Record approval in audit trail (non-blocking)
      try {
        await AuditTrailService.recordApproval(
          params.id,
          session.user.id,
          comment || `Bulk approved all ${allPendingSteps.length} steps`
        )
      } catch (auditError) {
        console.error('Warning: Failed to record approval audit trail:', auditError)
      }

      // Transition to Approved status
      const approved = await RequisitionService.approveRequisition(params.id)

      // Record status change (non-blocking)
      try {
        await AuditTrailService.recordStatusChange(
          params.id,
          session.user.id,
          requisition.status,
          approved.status,
          `Admin approved all ${allPendingSteps.length} approval steps`
        )
      } catch (auditError) {
        console.error('Warning: Failed to record status change audit trail:', auditError)
      }

      // Send approval notifications (non-blocking)
      try {
        await NotificationTriggersService.triggerApprovalNotifications(params.id, session.user.id)
      } catch (notificationError) {
        console.error('Warning: Failed to send approval notifications:', notificationError)
      }

      return NextResponse.json(approved)
    }

    // For non-admin users, verify they are assigned to this approval step
    if (nextStep.assignedUserId && nextStep.assignedUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to approve this requisition' },
        { status: 403 }
      )
    }

    // Approve the step
    await ApprovalWorkflowService.approveStep(nextStep.id, session.user.id, comment)

    // Record approval in audit trail (non-blocking)
    try {
      await AuditTrailService.recordApproval(
        params.id,
        session.user.id,
        comment
      )
    } catch (auditError) {
      console.error('Warning: Failed to record approval audit trail:', auditError)
    }

    // Check if all steps are approved
    const allApproved = await ApprovalWorkflowService.allStepsApproved(params.id)

    if (allApproved) {
      // Transition to Approved status
      const approved = await RequisitionService.approveRequisition(params.id)

      // Record status change (non-blocking)
      try {
        await AuditTrailService.recordStatusChange(
          params.id,
          session.user.id,
          requisition.status,
          approved.status,
          'All approvers approved'
        )
      } catch (auditError) {
        console.error('Warning: Failed to record status change audit trail:', auditError)
      }

      // Send approval notifications (non-blocking)
      try {
        await NotificationTriggersService.triggerApprovalNotifications(params.id, session.user.id)
      } catch (notificationError) {
        console.error('Warning: Failed to send approval notifications:', notificationError)
      }

      return NextResponse.json(approved)
    }

    // Get updated requisition
    const updated = await RequisitionService.getRequisition(params.id)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error approving requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve requisition' },
      { status: 400 }
    )
  }
}
