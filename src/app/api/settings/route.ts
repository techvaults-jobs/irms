import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user settings or create default settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      // Create default settings for user
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          emailNotifications: true,
          approvalReminders: true,
          weeklyReports: true,
          systemAlerts: true,
        },
      })
    }

    return NextResponse.json({
      emailNotifications: settings.emailNotifications,
      approvalReminders: settings.approvalReminders,
      weeklyReports: settings.weeklyReports,
      systemAlerts: settings.systemAlerts,
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Validate input
    if (
      typeof body.emailNotifications !== 'boolean' ||
      typeof body.approvalReminders !== 'boolean' ||
      typeof body.weeklyReports !== 'boolean' ||
      typeof body.systemAlerts !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        emailNotifications: body.emailNotifications,
        approvalReminders: body.approvalReminders,
        weeklyReports: body.weeklyReports,
        systemAlerts: body.systemAlerts,
      },
      create: {
        userId: session.user.id,
        emailNotifications: body.emailNotifications,
        approvalReminders: body.approvalReminders,
        weeklyReports: body.weeklyReports,
        systemAlerts: body.systemAlerts,
      },
    })

    return NextResponse.json({
      success: true,
      settings: {
        emailNotifications: settings.emailNotifications,
        approvalReminders: settings.approvalReminders,
        weeklyReports: settings.weeklyReports,
        systemAlerts: settings.systemAlerts,
      },
    })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
