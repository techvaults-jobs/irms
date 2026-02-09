'use client'

import { useEffect, useCallback, useRef } from 'react'

interface RealtimeNotification {
  type: string
  data?: any
}

/**
 * Hook for real-time notifications via Server-Sent Events
 * Provides instant notification delivery without polling
 */
export function useRealtimeNotifications(
  onNotification?: (notification: RealtimeNotification) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000 // 1 second

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    try {
      const eventSource = new EventSource('/api/notifications/stream')

      eventSource.addEventListener('CONNECTED', (event) => {
        console.log('Connected to notification stream')
        reconnectAttemptsRef.current = 0
      })

      eventSource.addEventListener('NOTIFICATION', (event) => {
        try {
          const notification = JSON.parse(event.data)
          if (onNotification) {
            onNotification(notification.data)
          }
        } catch (error) {
          console.error('Error parsing notification:', error)
        }
      })

      eventSource.addEventListener('HEARTBEAT', () => {
        // Keep-alive message, no action needed
      })

      eventSource.onerror = () => {
        console.error('EventSource error, attempting to reconnect...')
        eventSource.close()
        eventSourceRef.current = null

        // Exponential backoff reconnection
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
        reconnectAttemptsRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }

      eventSourceRef.current = eventSource
    } catch (error) {
      console.error('Error connecting to notification stream:', error)

      // Retry with exponential backoff
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
      reconnectAttemptsRef.current++

      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [onNotification])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    reconnectAttemptsRef.current = 0
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current !== null,
  }
}
