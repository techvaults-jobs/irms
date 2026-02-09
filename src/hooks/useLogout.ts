'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useLogout() {
  const router = useRouter()

  const logout = useCallback(async () => {
    try {
      // Clear all local storage
      localStorage.clear()

      // Clear all session storage
      sessionStorage.clear()

      // Clear IndexedDB (used by service workers and PWA)
      if ('indexedDB' in window) {
        const dbs = await indexedDB.databases()
        dbs.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        })
      }

      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }

      // Clear all cookies by setting them to expire
      document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })

      // Call logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // Clear browser cache if available
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }

      // Redirect to login page
      router.push('/auth/login')

      // Force page reload to clear any remaining state
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 500)
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      router.push('/auth/login')
      window.location.href = '/auth/login'
    }
  }, [router])

  return { logout }
}
