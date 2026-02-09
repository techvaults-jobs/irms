import { prisma } from '@/lib/prisma'

export interface UserSettings {
  emailNotifications: boolean
  approvalReminders: boolean
  weeklyReports: boolean
  systemAlerts: boolean
}

export class UserSettingsService {
  /**
   * Get user settings or create default settings
   */
  static async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      if (!settings) {
        // Create default settings
        settings = await prisma.userSettings.create({
          data: {
            userId,
            emailNotifications: true,
            approvalReminders: true,
            weeklyReports: true,
            systemAlerts: true,
          },
        })
      }

      return {
        emailNotifications: settings.emailNotifications,
        approvalReminders: settings.approvalReminders,
        weeklyReports: settings.weeklyReports,
        systemAlerts: settings.systemAlerts,
      }
    } catch (error) {
      console.error('Error getting user settings:', error)
      // Return default settings on error
      return {
        emailNotifications: true,
        approvalReminders: true,
        weeklyReports: true,
        systemAlerts: true,
      }
    }
  }

  /**
   * Check if user has email notifications enabled
   */
  static async isEmailNotificationsEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId)
    return settings.emailNotifications
  }

  /**
   * Check if user has approval reminders enabled
   */
  static async isApprovalRemindersEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId)
    return settings.approvalReminders
  }

  /**
   * Check if user has weekly reports enabled
   */
  static async isWeeklyReportsEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId)
    return settings.weeklyReports
  }

  /**
   * Check if user has system alerts enabled
   */
  static async isSystemAlertsEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId)
    return settings.systemAlerts
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    try {
      const updated = await prisma.userSettings.upsert({
        where: { userId },
        update: settings,
        create: {
          userId,
          ...settings,
        },
      })

      return {
        emailNotifications: updated.emailNotifications,
        approvalReminders: updated.approvalReminders,
        weeklyReports: updated.weeklyReports,
        systemAlerts: updated.systemAlerts,
      }
    } catch (error) {
      console.error('Error updating user settings:', error)
      throw error
    }
  }
}
