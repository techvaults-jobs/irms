import Queue from 'bull'
import { NotificationTriggersService } from '@/services/notification-triggers.service'
import { NotificationService } from '@/services/notification.service'

// Create job queues
const reminderQueue = new Queue('notification-reminders', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
})

const notificationQueue = new Queue('notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
})

/**
 * Job Scheduler Service
 * Handles scheduling and processing of background jobs
 */
export class JobSchedulerService {
  /**
   * Initialize job processors
   */
  static async initialize(): Promise<void> {
    // Process reminder jobs
    reminderQueue.process(async (job) => {
      try {
        await NotificationTriggersService.triggerPendingApprovalReminders()
        return { success: true }
      } catch (error) {
        console.error('Error processing reminder job:', error)
        throw error
      }
    })

    // Process notification jobs
    notificationQueue.process(async (job) => {
      const { type, data } = job.data

      try {
        switch (type) {
          case 'SUBMISSION':
            await NotificationTriggersService.triggerSubmissionNotifications(
              data.requisitionId
            )
            break
          case 'APPROVAL':
            await NotificationTriggersService.triggerApprovalNotifications(
              data.requisitionId,
              data.approverId
            )
            break
          case 'REJECTION':
            await NotificationTriggersService.triggerRejectionNotifications(
              data.requisitionId,
              data.rejectionReason
            )
            break
          case 'PAYMENT':
            await NotificationTriggersService.triggerPaymentNotifications(
              data.requisitionId,
              data.amountPaid
            )
            break
          default:
            throw new Error(`Unknown notification type: ${type}`)
        }
        return { success: true }
      } catch (error) {
        console.error(`Error processing ${type} notification:`, error)
        throw error
      }
    })

    // Set up recurring reminder job (every 6 hours)
    await reminderQueue.add(
      { type: 'PENDING_REMINDERS' },
      {
        repeat: {
          cron: '0 */6 * * *', // Every 6 hours
        },
        removeOnComplete: true,
      }
    )

    console.log('Job scheduler initialized')
  }

  /**
   * Schedule a submission notification
   */
  static async scheduleSubmissionNotification(
    requisitionId: string,
    delay?: number
  ): Promise<void> {
    await notificationQueue.add(
      {
        type: 'SUBMISSION',
        data: { requisitionId },
      },
      {
        delay: delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  }

  /**
   * Schedule an approval notification
   */
  static async scheduleApprovalNotification(
    requisitionId: string,
    approverId: string,
    delay?: number
  ): Promise<void> {
    await notificationQueue.add(
      {
        type: 'APPROVAL',
        data: { requisitionId, approverId },
      },
      {
        delay: delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  }

  /**
   * Schedule a rejection notification
   */
  static async scheduleRejectionNotification(
    requisitionId: string,
    rejectionReason: string,
    delay?: number
  ): Promise<void> {
    await notificationQueue.add(
      {
        type: 'REJECTION',
        data: { requisitionId, rejectionReason },
      },
      {
        delay: delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  }

  /**
   * Schedule a payment notification
   */
  static async schedulePaymentNotification(
    requisitionId: string,
    amountPaid: string,
    delay?: number
  ): Promise<void> {
    await notificationQueue.add(
      {
        type: 'PAYMENT',
        data: { requisitionId, amountPaid },
      },
      {
        delay: delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  }

  /**
   * Close job queues
   */
  static async close(): Promise<void> {
    await reminderQueue.close()
    await notificationQueue.close()
  }
}
