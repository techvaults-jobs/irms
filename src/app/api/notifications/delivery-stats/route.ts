import { NextResponse } from 'next/server'
import { NotificationManager } from '@/lib/notification-manager'
import { prisma } from '@/lib/prisma'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/delivery-stats
 * Get notification delivery statistics for the current user
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const stats = await NotificationManager.getDeliveryStats(user.id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting delivery stats:', error)
    return NextResponse.json(
      { error: 'Failed to get delivery stats' },
      { status: 500 }
    )
  }
}
