import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerConnection, unregisterConnection } from '@/lib/sse-broadcaster'

// Mark this as a dynamic route to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for real-time notifications
 */
export async function GET(request: NextRequest) {
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

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Store the controller for this user
        registerConnection(user.id, controller)

        // Send initial connection message
        controller.enqueue(
          `data: ${JSON.stringify({ type: 'CONNECTED', userId: user.id })}\n\n`
        )

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`)
          } catch (error) {
            clearInterval(heartbeatInterval)
            unregisterConnection(user.id)
          }
        }, 30000)

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          unregisterConnection(user.id)
          try {
            controller.close()
          } catch (error) {
            // Connection already closed
          }
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Error setting up notification stream:', error)
    return NextResponse.json(
      { error: 'Failed to set up notification stream' },
      { status: 500 }
    )
  }
}
