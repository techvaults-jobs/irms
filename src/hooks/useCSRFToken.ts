'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to get CSRF token from cookies
 * Used in client components to include token in form submissions
 */
export function useCSRFToken(): string | null {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Get CSRF token from cookies
    const cookies = document.cookie.split(';')
    const csrfCookie = cookies.find(c => c.trim().startsWith('csrf-token='))
    
    if (csrfCookie) {
      const tokenValue = csrfCookie.split('=')[1]
      setToken(tokenValue)
    }
  }, [])

  return token
}

/**
 * Helper to add CSRF token to fetch requests
 */
export function addCSRFTokenToRequest(
  options: RequestInit,
  token: string | null
): RequestInit {
  if (!token) {
    return options
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      'x-csrf-token': token,
    },
  }
}
