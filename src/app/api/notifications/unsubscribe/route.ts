import { NextRequest, NextResponse } from 'next/server'
import { PushNotificationService } from '@/lib/push-notifications'
import { prisma } from '@/lib/prisma'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from push notifications
 */
export async function POST(request: NextRequest) {
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
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Unsubscribe user
    await PushNotificationService.unsubscribeUser(user.id)

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    })
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    )
  }
}
