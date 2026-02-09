import { NextRequest, NextResponse } from 'next/server'
import { NotificationManager } from '@/lib/notification-manager'
import { prisma } from '@/lib/prisma'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/test
 * Test endpoint for sending test notifications
 * Only available in development mode
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    )
  }

  try {
    // Get session from auth (lazy import to avoid build issues)
    const { auth } = await import('@/auth')
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { type = 'APPROVED', channels = ['IN_APP', 'EMAIL', 'PUSH'] } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get a requisition to use for the test
    const requisition = await prisma.requisition.findFirst({
      where: { submitterId: user.id },
    })

    if (!requisition) {
      return NextResponse.json(
        { error: 'No requisitions found for this user' },
        { status: 404 }
      )
    }

    // Send test notification
    const result = await NotificationManager.sendNotification(
      user.id,
      requisition.id,
      type,
      `Test ${type} notification - ${new Date().toLocaleTimeString()}`,
      {
        channels: channels as any,
        priority: 'HIGH',
      }
    )

    // Get updated stats
    const stats = await NotificationManager.getDeliveryStats(user.id)

    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
      notification: {
        type,
        channels,
        result,
      },
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/test
 * Get test notification status
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    )
  }

  try {
    // Get session from auth (lazy import to avoid build issues)
    const { auth } = await import('@/auth')
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        settings: true,
        pushSubscription: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const stats = await NotificationManager.getDeliveryStats(user.id)
    const history = await NotificationManager.getDeliveryHistory(user.id, 10)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      settings: user.settings,
      pushSubscription: {
        isActive: user.pushSubscription?.isActive || false,
        createdAt: user.pushSubscription?.createdAt,
      },
      stats,
      recentDeliveries: history,
    })
  } catch (error) {
    console.error('Error getting test status:', error)
    return NextResponse.json(
      { error: 'Failed to get test status' },
      { status: 500 }
    )
  }
}
