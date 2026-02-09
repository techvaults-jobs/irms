'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

interface DeliveryStats {
  total: number
  delivered: number
  failed: number
  byChannel: {
    EMAIL: number
    PUSH: number
    IN_APP: number
  }
}

/**
 * Notification Settings Component
 * Allows users to manage push notifications and view delivery statistics
 */
export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const { isConnected } = useRealtimeNotifications()

  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Fetch delivery statistics
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true)
      setStatsError(null)

      try {
        const response = await fetch('/api/notifications/delivery-stats')
        if (!response.ok) {
          throw new Error('Failed to fetch delivery statistics')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        setStatsError(
          error instanceof Error ? error.message : 'Unknown error'
        )
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Push Notifications Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>

        {!isSupported ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Push notifications are not supported in your browser. Please use
              a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-600">
                  {isSubscribed
                    ? 'You will receive push notifications'
                    : 'You will not receive push notifications'}
                </p>
              </div>
              <button
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSubscribed
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isLoading
                  ? 'Loading...'
                  : isSubscribed
                    ? 'Disable'
                    : 'Enable'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time Connection Status */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Real-time Updates</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            <p className="text-sm text-gray-600">
              {isConnected
                ? 'Receiving real-time notifications'
                : 'Attempting to connect...'}
            </p>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Delivery Statistics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Delivery Statistics</h3>

        {statsLoading ? (
          <p className="text-gray-600">Loading statistics...</p>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{statsError}</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Notifications</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.delivered}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats.total > 0
                  ? Math.round((stats.delivered / stats.total) * 100)
                  : 0}
                %
              </p>
            </div>

            {/* Channel Breakdown */}
            <div className="col-span-2 border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                By Channel
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{stats.byChannel.EMAIL}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Push</span>
                  <span className="font-medium">{stats.byChannel.PUSH}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">In-App</span>
                  <span className="font-medium">{stats.byChannel.IN_APP}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Information */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">About Notifications</h3>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Push Notifications:</strong> Browser notifications that
            appear even when you&apos;re not on the website.
          </p>
          <p>
            <strong>Real-time Updates:</strong> Instant in-app notifications
            when you&apos;re using the application.
          </p>
          <p>
            <strong>Email Notifications:</strong> Email messages sent to your
            registered email address.
          </p>
          <p>
            You can manage your notification preferences in your account
            settings.
          </p>
        </div>
      </div>
    </div>
  )
}
