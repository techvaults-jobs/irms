import { prisma } from '@/lib/prisma'
import { AuditTrailService } from './audit-trail.service'

export const NotificationType = {
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  REMINDER: 'REMINDER',
} as const

export type NotificationTypeKey = keyof typeof NotificationType

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Notification Service
 * Handles sending notifications via email and recording them in the database
 */
export class NotificationService {
  /**
   * Send email using configured email service (Resend or SendGrid)
   */
  private static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<boolean> {
    try {
      const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY

      if (!apiKey) {
        console.warn('No email service configured. Skipping email send.')
        return false
      }

      if (process.env.RESEND_API_KEY) {
        // Use Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'noreply@irms.example.com',
            to,
            subject,
            html,
            text,
          }),
        })

        return response.ok
      } else if (process.env.SENDGRID_API_KEY) {
        // Use SendGrid
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: to }],
              },
            ],
            from: {
              email: 'noreply@irms.example.com',
              name: 'IRMS',
            },
            subject,
            content: [
              {
                type: 'text/html',
                value: html,
              },
              {
                type: 'text/plain',
                value: text,
              },
            ],
          }),
        })

        return response.ok
      }

      return false
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  /**
   * Get email template for submission notification
   */
  private static getSubmissionTemplate(
    requisitionTitle: string,
    requisitionId: string,
    approverName: string
  ): EmailTemplate {
    return {
      subject: `New Requisition Submitted: ${requisitionTitle}`,
      html: `
        <h2>New Requisition Submitted</h2>
        <p>Hi ${approverName},</p>
        <p>A new requisition has been submitted and requires your approval:</p>
        <p><strong>${requisitionTitle}</strong></p>
        <p>Requisition ID: ${requisitionId}</p>
        <p>Please review and take action at your earliest convenience.</p>
        <p>Best regards,<br>IRMS System</p>
      `,
      text: `New Requisition Submitted\n\nHi ${approverName},\n\nA new requisition has been submitted and requires your approval:\n\n${requisitionTitle}\n\nRequisition ID: ${requisitionId}\n\nPlease review and take action at your earliest convenience.\n\nBest regards,\nIRMS System`,
    }
  }

  /**
   * Get email template for approval notification
   */
  private static getApprovalTemplate(
    requisitionTitle: string,
    requisitionId: string,
    submitterName: string,
    approverName: string
  ): EmailTemplate {
    return {
      subject: `Requisition Approved: ${requisitionTitle}`,
      html: `
        <h2>Requisition Approved</h2>
        <p>Hi ${submitterName},</p>
        <p>Your requisition has been approved by ${approverName}:</p>
        <p><strong>${requisitionTitle}</strong></p>
        <p>Requisition ID: ${requisitionId}</p>
        <p>The requisition is now moving to the next stage of the approval process.</p>
        <p>Best regards,<br>IRMS System</p>
      `,
      text: `Requisition Approved\n\nHi ${submitterName},\n\nYour requisition has been approved by ${approverName}:\n\n${requisitionTitle}\n\nRequisition ID: ${requisitionId}\n\nThe requisition is now moving to the next stage of the approval process.\n\nBest regards,\nIRMS System`,
    }
  }

  /**
   * Get email template for rejection notification
   */
  private static getRejectionTemplate(
    requisitionTitle: string,
    requisitionId: string,
    submitterName: string,
    rejectionReason: string
  ): EmailTemplate {
    return {
      subject: `Requisition Rejected: ${requisitionTitle}`,
      html: `
        <h2>Requisition Rejected</h2>
        <p>Hi ${submitterName},</p>
        <p>Your requisition has been rejected:</p>
        <p><strong>${requisitionTitle}</strong></p>
        <p>Requisition ID: ${requisitionId}</p>
        <p><strong>Reason:</strong> ${rejectionReason}</p>
        <p>Please review the feedback and resubmit if needed.</p>
        <p>Best regards,<br>IRMS System</p>
      `,
      text: `Requisition Rejected\n\nHi ${submitterName},\n\nYour requisition has been rejected:\n\n${requisitionTitle}\n\nRequisition ID: ${requisitionId}\n\nReason: ${rejectionReason}\n\nPlease review the feedback and resubmit if needed.\n\nBest regards,\nIRMS System`,
    }
  }

  /**
   * Get email template for payment notification
   */
  private static getPaymentTemplate(
    requisitionTitle: string,
    requisitionId: string,
    submitterName: string,
    amountPaid: string
  ): EmailTemplate {
    return {
      subject: `Payment Recorded: ${requisitionTitle}`,
      html: `
        <h2>Payment Recorded</h2>
        <p>Hi ${submitterName},</p>
        <p>Payment has been recorded for your requisition:</p>
        <p><strong>${requisitionTitle}</strong></p>
        <p>Requisition ID: ${requisitionId}</p>
        <p><strong>Amount Paid:</strong> ${amountPaid}</p>
        <p>Your requisition is now marked as paid.</p>
        <p>Best regards,<br>IRMS System</p>
      `,
      text: `Payment Recorded\n\nHi ${submitterName},\n\nPayment has been recorded for your requisition:\n\n${requisitionTitle}\n\nRequisition ID: ${requisitionId}\n\nAmount Paid: ${amountPaid}\n\nYour requisition is now marked as paid.\n\nBest regards,\nIRMS System`,
    }
  }

  /**
   * Get email template for reminder notification
   */
  private static getReminderTemplate(
    requisitionTitle: string,
    requisitionId: string,
    approverName: string
  ): EmailTemplate {
    return {
      subject: `Reminder: Pending Requisition Approval - ${requisitionTitle}`,
      html: `
        <h2>Pending Approval Reminder</h2>
        <p>Hi ${approverName},</p>
        <p>This is a reminder that you have a pending requisition awaiting your approval:</p>
        <p><strong>${requisitionTitle}</strong></p>
        <p>Requisition ID: ${requisitionId}</p>
        <p>Please review and take action at your earliest convenience.</p>
        <p>Best regards,<br>IRMS System</p>
      `,
      text: `Pending Approval Reminder\n\nHi ${approverName},\n\nThis is a reminder that you have a pending requisition awaiting your approval:\n\n${requisitionTitle}\n\nRequisition ID: ${requisitionId}\n\nPlease review and take action at your earliest convenience.\n\nBest regards,\nIRMS System`,
    }
  }

  /**
   * Create and send a notification
   */
  static async sendNotification(
    userId: string,
    requisitionId: string,
    type: NotificationTypeKey,
    message: string,
    emailData?: {
      to: string
      subject: string
      html: string
      text: string
    }
  ): Promise<{ notification: any; emailSent: boolean }> {
    // Create notification record in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        requisitionId,
        type: NotificationType[type],
        message,
      },
      include: {
        user: true,
        requisition: true,
      },
    })

    // Send email if email data provided
    let emailSent = false
    if (emailData) {
      emailSent = await this.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.html,
        emailData.text
      )
    }

    // Record notification in audit trail
    await AuditTrailService.recordNotification(
      requisitionId,
      userId,
      NotificationType[type],
      message
    )

    return { notification, emailSent }
  }

  /**
   * Send submission notification to approver
   */
  static async sendSubmissionNotification(
    requisitionId: string,
    approverId: string,
    requisitionTitle: string
  ): Promise<{ notification: any; emailSent: boolean }> {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    })

    if (!approver) {
      throw new Error('Approver not found')
    }

    const template = this.getSubmissionTemplate(
      requisitionTitle,
      requisitionId,
      approver.name
    )

    return this.sendNotification(
      approverId,
      requisitionId,
      'SUBMITTED',
      `New requisition submitted: ${requisitionTitle}`,
      {
        to: approver.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }
    )
  }

  /**
   * Send approval notification to submitter and next approver
   */
  static async sendApprovalNotification(
    requisitionId: string,
    submitterId: string,
    approverId: string,
    requisitionTitle: string,
    nextApproverId?: string
  ): Promise<{ submitterNotification: any; nextApproverNotification?: any }> {
    const submitter = await prisma.user.findUnique({
      where: { id: submitterId },
    })

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    })

    if (!submitter || !approver) {
      throw new Error('User not found')
    }

    // Send notification to submitter
    const template = this.getApprovalTemplate(
      requisitionTitle,
      requisitionId,
      submitter.name,
      approver.name
    )

    const submitterNotification = await this.sendNotification(
      submitterId,
      requisitionId,
      'APPROVED',
      `Your requisition has been approved: ${requisitionTitle}`,
      {
        to: submitter.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }
    )

    // Send notification to next approver if applicable
    let nextApproverNotification
    if (nextApproverId) {
      nextApproverNotification = await this.sendSubmissionNotification(
        requisitionId,
        nextApproverId,
        requisitionTitle
      )
    }

    return { submitterNotification, nextApproverNotification }
  }

  /**
   * Send rejection notification to submitter
   */
  static async sendRejectionNotification(
    requisitionId: string,
    submitterId: string,
    requisitionTitle: string,
    rejectionReason: string
  ): Promise<{ notification: any; emailSent: boolean }> {
    const submitter = await prisma.user.findUnique({
      where: { id: submitterId },
    })

    if (!submitter) {
      throw new Error('Submitter not found')
    }

    const template = this.getRejectionTemplate(
      requisitionTitle,
      requisitionId,
      submitter.name,
      rejectionReason
    )

    return this.sendNotification(
      submitterId,
      requisitionId,
      'REJECTED',
      `Your requisition has been rejected: ${requisitionTitle}`,
      {
        to: submitter.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }
    )
  }

  /**
   * Send payment notification to submitter
   */
  static async sendPaymentNotification(
    requisitionId: string,
    submitterId: string,
    requisitionTitle: string,
    amountPaid: string
  ): Promise<{ notification: any; emailSent: boolean }> {
    const submitter = await prisma.user.findUnique({
      where: { id: submitterId },
    })

    if (!submitter) {
      throw new Error('Submitter not found')
    }

    const template = this.getPaymentTemplate(
      requisitionTitle,
      requisitionId,
      submitter.name,
      amountPaid
    )

    return this.sendNotification(
      submitterId,
      requisitionId,
      'PAID',
      `Payment recorded for your requisition: ${requisitionTitle}`,
      {
        to: submitter.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }
    )
  }

  /**
   * Send reminder notification to approver
   */
  static async sendReminderNotification(
    requisitionId: string,
    approverId: string,
    requisitionTitle: string
  ): Promise<{ notification: any; emailSent: boolean }> {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    })

    if (!approver) {
      throw new Error('Approver not found')
    }

    const template = this.getReminderTemplate(
      requisitionTitle,
      requisitionId,
      approver.name
    )

    return this.sendNotification(
      approverId,
      requisitionId,
      'REMINDER',
      `Reminder: Pending requisition approval - ${requisitionTitle}`,
      {
        to: approver.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }
    )
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    skip = 0,
    take = 50
  ) {
    return prisma.notification.findMany({
      where: { userId },
      include: {
        requisition: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    })
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string) {
    return prisma.notification.delete({
      where: { id: notificationId },
    })
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId: string) {
    return prisma.notification.deleteMany({
      where: { userId },
    })
  }
}
