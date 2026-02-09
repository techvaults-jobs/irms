'use client'

import { useEffect, useState, useCallback } from 'react'

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook for managing push notifications
 * Handles subscription, unsubscription, and real-time updates
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    error: null,
  })

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setState(prev => ({ ...prev, isSupported }))
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!state.isSupported) return

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw error
    }
  }, [state.isSupported])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Push notifications are not supported in this browser',
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Register service worker
      const registration = await registerServiceWorker()

      if (!registration) {
        throw new Error('Failed to register service worker')
      }

      // Get VAPID public key
      const vapidResponse = await fetch('/api/notifications/vapid-key')
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key')
      }
      const { vapidKey } = await vapidResponse.json()

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      // Send subscription to server
      const subscribeResponse = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!subscribeResponse.ok) {
        throw new Error('Failed to subscribe to push notifications')
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }))
    }
  }, [state.isSupported, registerServiceWorker])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
      })

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }))
    }
  }, [])

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!state.isSupported) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
      }))
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }, [state.isSupported])

  // Check subscription on mount
  useEffect(() => {
    if (state.isSupported) {
      checkSubscription()
    }
  }, [state.isSupported, checkSubscription])

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
