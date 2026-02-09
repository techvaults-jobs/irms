import { auth } from '@/auth'
import { RequisitionService } from '@/services/requisition.service'
import { ApprovalWorkflowService } from '@/services/approval-workflow.service'
import { AuditTrailService } from '@/services/audit-trail.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { NextRequest, NextResponse } from 'next/server'

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

    const requisition = await RequisitionService.getRequisition(params.id)

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisition not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (requisition.submitter.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Submit the requisition
    const submitted = await RequisitionService.submitRequisition(params.id)

    // Record status change in audit trail
    await AuditTrailService.recordStatusChange(
      params.id,
      session.user.id,
      requisition.status,
      submitted.status,
      'Requisition submitted by staff member'
    )

    // Determine required approvers based on amount and approval rules
    const approverRoles = await ApprovalWorkflowService.determineApprovers(
      requisition.estimatedCost,
      requisition.department.id
    )

    // Create approval steps
    await ApprovalWorkflowService.createApprovalSteps(params.id, approverRoles)

    // Transition to Under Review
    const underReview = await RequisitionService.transitionToUnderReview(params.id)

    // Record transition to Under Review
    await AuditTrailService.recordStatusChange(
      params.id,
      session.user.id,
      submitted.status,
      underReview.status,
      `Automatically transitioned to Under Review with ${approverRoles.join(', ')} approval required`
    )

    // Trigger submission notifications to approvers (non-blocking)
    try {
      await NotificationTriggersService.triggerSubmissionNotifications(params.id)
    } catch (notificationError) {
      console.error('Warning: Failed to send submission notifications:', notificationError)
    }

    return NextResponse.json(underReview)
  } catch (error: any) {
    console.error('Error submitting requisition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit requisition' },
      { status: 400 }
    )
  }
}
