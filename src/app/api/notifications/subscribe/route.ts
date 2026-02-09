import { NextRequest, NextResponse } from 'next/server'
import { PushNotificationService } from '@/lib/push-notifications'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications
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

    const { subscription } = await request.json()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription data is required' },
        { status: 400 }
      )
    }

    // Get user from session
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Subscribe user
    await PushNotificationService.subscribeUser(user.id, subscription)

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
    })
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    )
  }
}
