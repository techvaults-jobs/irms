import { NotificationTriggersService } from './notification-triggers.service'

/**
 * Reminder Job Scheduler Service
 * Handles scheduling and execution of reminder notification jobs
 * 
 * This service manages background jobs for sending reminder notifications
 * to approvers with pending requisitions that have been waiting for approval
 * for a configurable time period.
 */
export class ReminderJobSchedulerService {
  private static jobIntervalId: NodeJS.Timeout | null = null
  private static isRunning = false

  /**
   * Default reminder interval in milliseconds (24 hours)
   */
  private static readonly DEFAULT_REMINDER_INTERVAL = 24 * 60 * 60 * 1000

  /**
   * Get the configured reminder interval from environment or use default
   */
  private static getReminderInterval(): number {
    const configuredInterval = process.env.REMINDER_INTERVAL_MS
    if (configuredInterval) {
      const parsed = parseInt(configuredInterval, 10)
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
    return this.DEFAULT_REMINDER_INTERVAL
  }

  /**
   * Start the reminder job scheduler
   * This should be called once when the application starts
   */
  static startScheduler(): void {
    if (this.jobIntervalId !== null) {
      console.warn('Reminder job scheduler is already running')
      return
    }

    const interval = this.getReminderInterval()
    console.log(
      `Starting reminder job scheduler with interval: ${interval}ms (${interval / 1000 / 60 / 60} hours)`
    )

    // Run the job immediately on startup
    this.executeReminderJob().catch(error => {
      console.error('Error executing reminder job on startup:', error)
    })

    // Schedule the job to run at the configured interval
    this.jobIntervalId = setInterval(() => {
      this.executeReminderJob().catch(error => {
        console.error('Error executing scheduled reminder job:', error)
      })
    }, interval)
  }

  /**
   * Stop the reminder job scheduler
   */
  static stopScheduler(): void {
    if (this.jobIntervalId !== null) {
      clearInterval(this.jobIntervalId)
      this.jobIntervalId = null
      console.log('Reminder job scheduler stopped')
    }
  }

  /**
   * Execute the reminder job
   * Sends reminder notifications to approvers with pending requisitions
   */
  private static async executeReminderJob(): Promise<void> {
    if (this.isRunning) {
      console.warn('Reminder job is already running, skipping execution')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      console.log('Executing reminder job for pending approvals...')

      // Trigger pending approval reminders
      await NotificationTriggersService.triggerPendingApprovalReminders()

      const duration = Date.now() - startTime
      console.log(`Reminder job completed successfully in ${duration}ms`)
    } catch (error) {
      console.error('Error during reminder job execution:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Manually trigger a reminder job execution
   * Useful for testing or manual triggering
   */
  static async triggerManualReminder(): Promise<void> {
    console.log('Manually triggering reminder job...')
    await this.executeReminderJob()
  }

  /**
   * Check if the scheduler is currently running
   */
  static isSchedulerRunning(): boolean {
    return this.jobIntervalId !== null
  }

  /**
   * Get the current scheduler status
   */
  static getSchedulerStatus(): {
    isRunning: boolean
    isJobExecuting: boolean
    interval: number
  } {
    return {
      isRunning: this.isSchedulerRunning(),
      isJobExecuting: this.isRunning,
      interval: this.getReminderInterval(),
    }
  }

  /**
   * Reconfigure the reminder interval
   * Stops the current scheduler and starts a new one with the new interval
   */
  static reconfigureInterval(intervalMs: number): void {
    if (intervalMs <= 0) {
      throw new Error('Interval must be greater than 0')
    }

    console.log(`Reconfiguring reminder interval to ${intervalMs}ms`)
    this.stopScheduler()

    // Update environment variable for next startup
    process.env.REMINDER_INTERVAL_MS = intervalMs.toString()

    this.startScheduler()
  }
}
