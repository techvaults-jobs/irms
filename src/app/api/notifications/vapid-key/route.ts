import { NextResponse } from 'next/server'
import { PushNotificationService } from '@/lib/push-notifications'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/vapid-key
 * Get VAPID public key for client-side push subscription
 */
export async function GET() {
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

    if (!PushNotificationService.isPushNotificationsConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    const vapidKey = PushNotificationService.getVapidPublicKey()

    return NextResponse.json({
      vapidKey,
    })
  } catch (error) {
    console.error('Error getting VAPID key:', error)
    return NextResponse.json(
      { error: 'Failed to get VAPID key' },
      { status: 500 }
    )
  }
}
