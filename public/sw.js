// Service Worker for handling push notifications

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push notification received but no data')
    return
  }

  try {
    const data = event.data.json()
    const { title, body, icon, badge, tag, data: notificationData } = data

    const options = {
      body,
      icon: icon || '/logo.png',
      badge: badge || '/logo-sm.png',
      tag: tag || 'notification',
      data: notificationData || {},
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'close',
          title: 'Close',
        },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch (error) {
    console.error('Error handling push notification:', error)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const notificationData = event.notification.data
  const requisitionId = notificationData?.requisitionId

  if (requisitionId) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's already a window/tab open with the app
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(`/requisitions/${requisitionId}`)
        }
      })
    )
  }
})

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag)
})

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications')
        .then(response => response.json())
        .catch(error => console.error('Error syncing notifications:', error))
    )
  }
})
