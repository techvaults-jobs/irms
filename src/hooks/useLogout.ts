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

      // Sign out using NextAuth - this is the primary logout method
      await signOut({ redirect: false })

      // Call logout API endpoint to clear server-side cookies
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
