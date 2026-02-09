import webpush from 'web-push'
import { prisma } from './prisma'

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'admin@irms.example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
}

/**
 * Push Notification Service
 * Handles Web Push notifications to subscribed users
 */
export class PushNotificationService {
  /**
   * Subscribe user to push notifications
   */
  static async subscribeUser(
    userId: string,
    subscription: PushSubscriptionJSON
  ): Promise<void> {
    try {
      await prisma.pushSubscription.upsert({
        where: { userId },
        update: {
          subscription: JSON.stringify(subscription),
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          subscription: JSON.stringify(subscription),
          isActive: true,
        },
      })
    } catch (error) {
      console.error('Error subscribing user to push notifications:', error)
      throw error
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  static async unsubscribeUser(userId: string): Promise<void> {
    try {
      await prisma.pushSubscription.update({
        where: { userId },
        data: { isActive: false },
      })
    } catch (error) {
      console.error('Error unsubscribing user from push notifications:', error)
      throw error
    }
  }

  /**
   * Send push notification to a user
   */
  static async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId },
      })

      if (!subscription || !subscription.isActive) {
        return { success: false, error: 'User not subscribed to push notifications' }
      }

      const parsedSubscription = JSON.parse(subscription.subscription)

      await webpush.sendNotification(parsedSubscription, JSON.stringify(payload))

      // Record delivery
      await prisma.notificationDelivery.create({
        data: {
          userId,
          channel: 'PUSH',
          status: 'DELIVERED',
          payload: JSON.stringify(payload),
        },
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error sending push notification:', error)

      // Handle subscription errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid
        await prisma.pushSubscription.update({
          where: { userId },
          data: { isActive: false },
        })
      }

      // Record failed delivery
      try {
        await prisma.notificationDelivery.create({
          data: {
            userId,
            channel: 'PUSH',
            status: 'FAILED',
            payload: JSON.stringify(payload),
            error: error.message,
          },
        })
      } catch (e) {
        console.error('Error recording failed delivery:', e)
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendBulkPushNotification(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0
    let failed = 0

    for (const userId of userIds) {
      const result = await this.sendPushNotification(userId, payload)
      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    return { successful, failed }
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  static getVapidPublicKey(): string {
    if (!process.env.VAPID_PUBLIC_KEY) {
      throw new Error('VAPID_PUBLIC_KEY not configured')
    }
    return process.env.VAPID_PUBLIC_KEY
  }

  /**
   * Check if push notifications are configured
   */
  static isPushNotificationsConfigured(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  }
}
