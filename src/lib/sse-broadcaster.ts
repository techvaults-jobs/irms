// Store active connections
const activeConnections = new Map<string, ReadableStreamDefaultController>()

/**
 * Register a new SSE connection for a user
 */
export function registerConnection(
  userId: string,
  controller: ReadableStreamDefaultController
): void {
  activeConnections.set(userId, controller)
}

/**
 * Unregister an SSE connection for a user
 */
export function unregisterConnection(userId: string): void {
  activeConnections.delete(userId)
}

/**
 * Broadcast notification to a user via SSE
 */
export function broadcastNotification(
  userId: string,
  notification: any
): void {
  const controller = activeConnections.get(userId)
  if (controller) {
    try {
      controller.enqueue(
        `data: ${JSON.stringify({ type: 'NOTIFICATION', data: notification })}\n\n`
      )
    } catch (error) {
      console.error('Error broadcasting notification:', error)
      activeConnections.delete(userId)
    }
  }
}

/**
 * Broadcast notification to multiple users
 */
export function broadcastBulkNotification(
  userIds: string[],
  notification: any
): void {
  userIds.forEach(userId => {
    broadcastNotification(userId, notification)
  })
}

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
  return activeConnections.size
}
