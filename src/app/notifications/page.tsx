'use client'

import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import DashboardLayout from '@/components/DashboardLayout'
import { Bell, Trash2, Check, CheckCheck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotificationsPage() {
  const { isLoading: authLoading } = useAuth()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUBMITTED':
        return 'border-l-blue-500 bg-blue-50'
      case 'APPROVED':
        return 'border-l-green-500 bg-green-50'
      case 'REJECTED':
        return 'border-l-red-500 bg-red-50'
      case 'PAID':
        return 'border-l-purple-500 bg-purple-50'
      case 'REMINDER':
        return 'border-l-yellow-500 bg-yellow-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUBMITTED':
        return '📤'
      case 'APPROVED':
        return '✅'
      case 'REJECTED':
        return '❌'
      case 'PAID':
        return '💰'
      case 'REMINDER':
        return '⏰'
      default:
        return '📢'
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full"
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-8 text-white mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Bell size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-red-100 mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex gap-2"
        >
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
          >
            <CheckCheck size={18} />
            Mark all as read
          </button>
        </motion.div>
      )}

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full"
            />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block p-4 bg-red-50 rounded-lg mb-4"
            >
              <Bell size={40} className="text-red-600" />
            </motion.div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You&apos;re all caught up! Check back later for updates.</p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-lg shadow border-l-4 ${getNotificationColor(notification.type)} p-6 hover:shadow-lg transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{notification.requisition.title}</h3>
                      <p className="text-xs text-gray-500">
                        Requisition ID: {notification.requisitionId}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                      {new Date(notification.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      notification.requisition.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : notification.requisition.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : notification.requisition.status === 'PAID'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {notification.requisition.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                      title="Mark as read"
                    >
                      <Check size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </DashboardLayout>
  )
}
