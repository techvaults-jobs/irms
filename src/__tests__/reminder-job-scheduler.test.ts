/**
 * Unit Tests: Reminder Job Scheduler
 * Feature: irms
 * Tests the reminder job scheduler functionality for pending approval reminders
 * Validates: Requirements 7.5
 */

import { ReminderJobSchedulerService } from '@/services/reminder-job-scheduler.service'
import { NotificationTriggersService } from '@/services/notification-triggers.service'

// Mock the NotificationTriggersService
jest.mock('@/services/notification-triggers.service')

describe('Reminder Job Scheduler', () => {
  afterEach(() => {
    // Stop the scheduler after each test
    ReminderJobSchedulerService.stopScheduler()
    jest.clearAllMocks()
  })

  describe('Scheduler Lifecycle', () => {
    it('should start the scheduler', () => {
      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Start the scheduler
      ReminderJobSchedulerService.startScheduler()

      // Verify it's running
      expect(ReminderJobSchedulerService.isSchedulerRunning()).toBe(true)

      // Clean up
      ReminderJobSchedulerService.stopScheduler()
    })

    it('should stop the scheduler', () => {
      // Start the scheduler
      ReminderJobSchedulerService.startScheduler()
      expect(ReminderJobSchedulerService.isSchedulerRunning()).toBe(true)

      // Stop the scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Verify it's stopped
      expect(ReminderJobSchedulerService.isSchedulerRunning()).toBe(false)
    })

    it('should not start scheduler twice', () => {
      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Start the scheduler
      ReminderJobSchedulerService.startScheduler()
      expect(ReminderJobSchedulerService.isSchedulerRunning()).toBe(true)

      // Try to start again (should log warning but not fail)
      ReminderJobSchedulerService.startScheduler()
      expect(ReminderJobSchedulerService.isSchedulerRunning()).toBe(true)

      // Clean up
      ReminderJobSchedulerService.stopScheduler()
    })

    it('should get scheduler status', async () => {
      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Get status when stopped
      let status = ReminderJobSchedulerService.getSchedulerStatus()
      expect(status.isRunning).toBe(false)
      expect(status.isJobExecuting).toBe(false)
      expect(status.interval).toBeGreaterThan(0)

      // Start the scheduler
      ReminderJobSchedulerService.startScheduler()

      // Wait a bit for the initial job to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get status when running
      status = ReminderJobSchedulerService.getSchedulerStatus()
      expect(status.isRunning).toBe(true)
      expect(status.interval).toBeGreaterThan(0)

      // Clean up
      ReminderJobSchedulerService.stopScheduler()
    })
  })

  describe('Scheduler Configuration', () => {
    it('should use default interval when not configured', () => {
      // Clear the environment variable
      delete process.env.REMINDER_INTERVAL_MS

      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Get status
      const status = ReminderJobSchedulerService.getSchedulerStatus()

      // Should use default 24 hour interval (86400000 ms)
      expect(status.interval).toBe(24 * 60 * 60 * 1000)
    })

    it('should use configured interval from environment', () => {
      // Set a custom interval (1 hour)
      const customInterval = 60 * 60 * 1000
      process.env.REMINDER_INTERVAL_MS = customInterval.toString()

      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Get status
      const status = ReminderJobSchedulerService.getSchedulerStatus()

      // Should use configured interval
      expect(status.interval).toBe(customInterval)

      // Clean up
      delete process.env.REMINDER_INTERVAL_MS
    })

    it('should reconfigure interval', () => {
      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Reconfigure to 2 hours
      const newInterval = 2 * 60 * 60 * 1000
      ReminderJobSchedulerService.reconfigureInterval(newInterval)

      // Verify new interval
      const status = ReminderJobSchedulerService.getSchedulerStatus()
      expect(status.interval).toBe(newInterval)
      expect(status.isRunning).toBe(true)

      // Clean up
      ReminderJobSchedulerService.stopScheduler()
      delete process.env.REMINDER_INTERVAL_MS
    })

    it('should reject invalid interval', () => {
      // Stop any existing scheduler
      ReminderJobSchedulerService.stopScheduler()

      // Try to set invalid interval
      expect(() => {
        ReminderJobSchedulerService.reconfigureInterval(0)
      }).toThrow('Interval must be greater than 0')

      expect(() => {
        ReminderJobSchedulerService.reconfigureInterval(-1000)
      }).toThrow('Interval must be greater than 0')

      // Clean up
      delete process.env.REMINDER_INTERVAL_MS
    })
  })

  describe('Reminder Job Execution', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks()
    })

    it('should trigger pending approval reminders when job executes', async () => {
      // Mock the triggerPendingApprovalReminders method
      const mockTrigger = jest
        .mocked(NotificationTriggersService.triggerPendingApprovalReminders)
        .mockResolvedValueOnce(undefined)

      // Trigger manual reminder
      await ReminderJobSchedulerService.triggerManualReminder()

      // Verify the trigger was called
      expect(mockTrigger).toHaveBeenCalled()
    })

    it('should handle errors during job execution gracefully', async () => {
      // Mock the triggerPendingApprovalReminders to throw an error
      const mockTrigger = jest
        .mocked(NotificationTriggersService.triggerPendingApprovalReminders)
        .mockRejectedValueOnce(new Error('Test error'))

      // Should throw the error
      await expect(
        ReminderJobSchedulerService.triggerManualReminder()
      ).rejects.toThrow('Test error')
    })

    it('should prevent concurrent job execution', async () => {
      // Mock the triggerPendingApprovalReminders to take some time
      const mockTrigger = jest
        .mocked(NotificationTriggersService.triggerPendingApprovalReminders)
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              setTimeout(resolve, 50)
            })
        )

      // Start first job
      const job1 = ReminderJobSchedulerService.triggerManualReminder()

      // Try to start second job immediately (should be skipped)
      const job2 = ReminderJobSchedulerService.triggerManualReminder()

      // Wait for both to complete
      await Promise.all([job1, job2])

      // Verify trigger was called only once (second call was skipped)
      expect(mockTrigger).toHaveBeenCalledTimes(1)
    })
  })
})
