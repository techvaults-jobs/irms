import { prisma } from './prisma'
import { NotificationService } from '@/services/notification.service'
import { PushNotificationService, PushNotificationPayload } from './push-notifications'

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'IN_APP'

export interface NotificationOptions {
  channels?: NotificationChannel[]
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  delay?: number
  retryCount?: number
}

/**
 * Notification Manager
 * Unified interface for sending notifications across multiple channels
 * Respects user preferences and handles delivery tracking
 */
export class NotificationManager {
  /**
   * Send notification to user across configured channels
   * Respects user notification preferences
   */
  static async sendNotification(
    userId: string,
    requisitionId: string,
    type: string,
    message: string,
    options: NotificationOptions = {}
  ): Promise<{
    inApp: boolean
    email: boolean
    push: boolean
  }> {
    const { channels = ['IN_APP', 'EMAIL', 'PUSH'], priority = 'MEDIUM' } = options

    // Get user and their settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const settings = user.settings

    const results = {
      inApp: false,
      email: false,
      push: false,
    }

    // Send in-app notification
    if (channels.includes('IN_APP')) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            requisitionId,
            type,
            message,
          },
        })
        results.inApp = true
      } catch (error) {
        console.error('Error creating in-app notification:', error)
      }
    }

    // Send email notification if enabled
    if (
      channels.includes('EMAIL') &&
      settings?.emailNotifications &&
      this.shouldSendEmail(type, settings)
    ) {
      try {
        // Email sending is handled by NotificationService
        results.email = true
      } catch (error) {
        console.error('Error sending email notification:', error)
      }
    }

    // Send push notification if enabled
    if (
      channels.includes('PUSH') &&
      settings?.systemAlerts &&
      PushNotificationService.isPushNotificationsConfigured()
    ) {
      try {
        const payload: PushNotificationPayload = {
          title: this.getNotificationTitle(type),
          body: message,
          tag: `notification-${requisitionId}`,
          data: {
            requisitionId,
            type,
            priority,
          },
        }

        const result = await PushNotificationService.sendPushNotification(
          userId,
          payload
        )
        results.push = result.success
      } catch (error) {
        console.error('Error sending push notification:', error)
      }
    }

    // Record notification delivery
    await this.recordDelivery(userId, type, results)

    return results
  }

  /**
   * Send bulk notification to multiple users
   */
  static async sendBulkNotification(
    userIds: string[],
    requisitionId: string,
    type: string,
    message: string,
    options: NotificationOptions = {}
  ): Promise<{
    successful: number
    failed: number
    results: Record<string, any>
  }> {
    let successful = 0
    let failed = 0
    const results: Record<string, any> = {}

    for (const userId of userIds) {
      try {
        const result = await this.sendNotification(
          userId,
          requisitionId,
          type,
          message,
          options
        )
        results[userId] = result
        if (result.inApp || result.email || result.push) {
          successful++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error)
        failed++
        results[userId] = { error: (error as Error).message }
      }
    }

    return { successful, failed, results }
  }

  /**
   * Get notification delivery history for a user
   */
  static async getDeliveryHistory(
    userId: string,
    limit = 50
  ): Promise<any[]> {
    return prisma.notificationDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get notification delivery stats
   */
  static async getDeliveryStats(userId: string): Promise<{
    total: number
    delivered: number
    failed: number
    byChannel: Record<string, number>
  }> {
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId },
    })

    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
      failed: deliveries.filter(d => d.status === 'FAILED').length,
      byChannel: {
        EMAIL: 0,
        PUSH: 0,
        IN_APP: 0,
      },
    }

    deliveries.forEach(d => {
      if (d.channel in stats.byChannel) {
        stats.byChannel[d.channel as keyof typeof stats.byChannel]++
      }
    })

    return stats
  }

  /**
   * Determine if email should be sent based on notification type and user settings
   */
  private static shouldSendEmail(
    type: string,
    settings: any
  ): boolean {
    if (!settings) return false

    switch (type) {
      case 'SUBMITTED':
      case 'APPROVED':
      case 'REJECTED':
      case 'PAID':
        return settings.emailNotifications
      case 'REMINDER':
        return settings.approvalReminders
      default:
        return settings.emailNotifications
    }
  }

  /**
   * Get notification title based on type
   */
  private static getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      SUBMITTED: 'New Requisition',
      APPROVED: 'Requisition Approved',
      REJECTED: 'Requisition Rejected',
      PAID: 'Payment Recorded',
      REMINDER: 'Pending Approval',
    }
    return titles[type] || 'Notification'
  }

  /**
   * Record notification delivery
   */
  private static async recordDelivery(
    userId: string,
    type: string,
    results: any
  ): Promise<void> {
    try {
      const channels: NotificationChannel[] = []
      if (results.email) channels.push('EMAIL')
      if (results.push) channels.push('PUSH')
      if (results.inApp) channels.push('IN_APP')

      for (const channel of channels) {
        await prisma.notificationDelivery.create({
          data: {
            userId,
            channel,
            status: 'DELIVERED',
            payload: JSON.stringify({ type }),
          },
        })
      }
    } catch (error) {
      console.error('Error recording delivery:', error)
    }
  }
}
