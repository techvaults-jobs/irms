import { prisma } from '@/lib/prisma'
import { NotificationService } from './notification.service'
import { ApprovalWorkflowService } from './approval-workflow.service'

/**
 * Notification Triggers Service
 * Handles triggering notifications at key points in the requisition workflow
 */
export class NotificationTriggersService {
  /**
   * Trigger notification when requisition is submitted
   * Sends notification to the first approver
   */
  static async triggerSubmissionNotifications(requisitionId: string): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        submitter: true,
        approvalSteps: {
          where: { stepNumber: 1 },
          include: { assignedUser: true },
        },
      },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Get the first approval step
    const firstStep = requisition.approvalSteps[0]

    if (firstStep && firstStep.assignedUserId) {
      // Send notification to the assigned approver
      await NotificationService.sendSubmissionNotification(
        requisitionId,
        firstStep.assignedUserId,
        requisition.title
      )
    } else {
      // If no specific user assigned, find users with the required role
      const requiredRole = firstStep?.requiredRole || 'MANAGER'
      const approvers = await prisma.user.findMany({
        where: {
          role: requiredRole as any,
          departmentId: requisition.departmentId,
          isActive: true,
        },
      })

      // Send notification to all approvers with the required role
      for (const approver of approvers) {
        await NotificationService.sendSubmissionNotification(
          requisitionId,
          approver.id,
          requisition.title
        )
      }
    }
  }

  /**
   * Trigger notification when requisition is approved
   * Sends notification to submitter and next approver (if applicable)
   */
  static async triggerApprovalNotifications(
    requisitionId: string,
    approverId: string
  ): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        submitter: true,
        approvalSteps: {
          orderBy: { stepNumber: 'asc' },
          include: { assignedUser: true },
        },
      },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Find the next pending step
    const nextPendingStep = requisition.approvalSteps.find(
      step => step.status === 'PENDING'
    )

    let nextApproverId: string | undefined

    if (nextPendingStep) {
      if (nextPendingStep.assignedUserId) {
        nextApproverId = nextPendingStep.assignedUserId
      } else {
        // Find a user with the required role
        const approver = await prisma.user.findFirst({
          where: {
            role: nextPendingStep.requiredRole as any,
            departmentId: requisition.departmentId,
            isActive: true,
          },
        })
        nextApproverId = approver?.id
      }
    }

    // Send approval notification to submitter and next approver
    await NotificationService.sendApprovalNotification(
      requisitionId,
      requisition.submitterId,
      approverId,
      requisition.title,
      nextApproverId
    )
  }

  /**
   * Trigger notification when requisition is rejected
   * Sends notification to submitter with rejection reason
   */
  static async triggerRejectionNotifications(
    requisitionId: string,
    rejectionReason: string
  ): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        submitter: true,
      },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Send rejection notification to submitter
    await NotificationService.sendRejectionNotification(
      requisitionId,
      requisition.submitterId,
      requisition.title,
      rejectionReason
    )
  }

  /**
   * Trigger notification when payment is recorded
   * Sends notification to submitter
   */
  static async triggerPaymentNotifications(
    requisitionId: string,
    amountPaid: string
  ): Promise<void> {
    const requisition = await prisma.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        submitter: true,
      },
    })

    if (!requisition) {
      throw new Error('Requisition not found')
    }

    // Send payment notification to submitter
    await NotificationService.sendPaymentNotification(
      requisitionId,
      requisition.submitterId,
      requisition.title,
      amountPaid
    )
  }

  /**
   * Trigger reminder notification for pending approvals
   * Should be called by a scheduled job
   */
  static async triggerPendingApprovalReminders(): Promise<void> {
    // Get all pending approval steps that have been pending for more than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const pendingSteps = await prisma.approvalStep.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: oneDayAgo,
        },
      },
      include: {
        requisition: true,
        assignedUser: true,
      },
    })

    for (const step of pendingSteps) {
      if (step.assignedUserId) {
        await NotificationService.sendReminderNotification(
          step.requisitionId,
          step.assignedUserId,
          step.requisition.title
        )
      }
    }
  }

  /**
   * Trigger reminder notification for a specific pending approval
   */
  static async triggerPendingApprovalReminder(
    approvalStepId: string
  ): Promise<void> {
    const step = await prisma.approvalStep.findUnique({
      where: { id: approvalStepId },
      include: {
        requisition: true,
        assignedUser: true,
      },
    })

    if (!step) {
      throw new Error('Approval step not found')
    }

    if (step.status !== 'PENDING') {
      throw new Error('Approval step is not pending')
    }

    if (step.assignedUserId) {
      await NotificationService.sendReminderNotification(
        step.requisitionId,
        step.assignedUserId,
        step.requisition.title
      )
    }
  }
}
