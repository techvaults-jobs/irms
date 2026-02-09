'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

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
        try {
          const dbs = await indexedDB.databases()
          dbs.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
            }
          })
        } catch (e) {
          console.error('Error clearing IndexedDB:', e)
        }
      }

      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
          }
        } catch (e) {
          console.error('Error clearing service workers:', e)
        }
      }

      // Clear all cookies by setting them to expire
      document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })

      // Clear browser cache if available
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        } catch (e) {
          console.error('Error clearing caches:', e)
        }
      }

      // Sign out using NextAuth
      await signOut({ redirect: false })

      // Call logout API endpoint to clear server-side session
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (e) {
        console.error('Error calling logout endpoint:', e)
      }

      // Redirect to login page
      router.push('/auth/login')

      // Force page reload to clear any remaining state
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 1000)
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      window.location.href = '/auth/login'
    }
  }, [router])

  return { logout }
}
